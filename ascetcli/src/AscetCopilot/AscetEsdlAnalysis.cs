using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

public sealed class AscetEsdlAnalysisResult
{
    public bool ParseSucceeded { get; set; }
    public IList<string> Reads { get; set; }
    public IList<string> Writes { get; set; }
    public IList<string> Calls { get; set; }
    public IList<string> ReferencedComponents { get; set; }
    public IList<string> Diagnostics { get; set; }
}

public interface IEsdlAnalysisService
{
    AscetEsdlAnalysisResult Analyze(string code, IList<string> referenceNames);
}

public sealed class EsdlAnalysisService : IEsdlAnalysisService
{
    public AscetEsdlAnalysisResult Analyze(string code, IList<string> referenceNames)
    {
        AscetEsdlAnalysisResult result = CreateEmptyResult();
        try
        {
            EsdlParser parser = new EsdlParser(code ?? String.Empty);
            EsdlProgram program = parser.ParseProgram();
            EsdlSemanticCollector collector = new EsdlSemanticCollector(referenceNames);
            collector.VisitProgram(program);

            result.ParseSucceeded = true;
            result.Reads = collector.Reads;
            result.Writes = collector.Writes;
            result.Calls = collector.Calls;
            result.ReferencedComponents = collector.ReferencedComponents;
            return result;
        }
        catch (EsdlParseException ex)
        {
            result.ParseSucceeded = false;
            result.Diagnostics.Add(ex.Message);
            return result;
        }
    }

    private AscetEsdlAnalysisResult CreateEmptyResult()
    {
        return new AscetEsdlAnalysisResult
        {
            ParseSucceeded = false,
            Reads = new List<string>(),
            Writes = new List<string>(),
            Calls = new List<string>(),
            ReferencedComponents = new List<string>(),
            Diagnostics = new List<string>()
        };
    }
}

internal sealed class EsdlSemanticCollector
{
    private readonly Dictionary<string, bool> referenceNames;

    public EsdlSemanticCollector(IList<string> referenceNames)
    {
        this.referenceNames = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (referenceNames != null)
        {
            for (int i = 0; i < referenceNames.Count; i++)
            {
                string name = referenceNames[i];
                if (!String.IsNullOrWhiteSpace(name))
                {
                    this.referenceNames[name] = true;
                }
            }
        }

        Reads = new List<string>();
        Writes = new List<string>();
        Calls = new List<string>();
        ReferencedComponents = new List<string>();
    }

    public List<string> Reads { get; private set; }
    public List<string> Writes { get; private set; }
    public List<string> Calls { get; private set; }
    public List<string> ReferencedComponents { get; private set; }

    public void VisitProgram(EsdlProgram program)
    {
        if (program == null || program.Statements == null)
        {
            return;
        }

        for (int i = 0; i < program.Statements.Count; i++)
        {
            VisitStatement(program.Statements[i]);
        }
    }

    private void VisitStatement(EsdlStatement statement)
    {
        if (statement == null)
        {
            return;
        }

        if (statement is EsdlExpressionStatement)
        {
            VisitExpression(((EsdlExpressionStatement)statement).Expression, false);
            return;
        }

        if (statement is EsdlReturnStatement)
        {
            VisitExpression(((EsdlReturnStatement)statement).Expression, false);
            return;
        }

        if (statement is EsdlBlockStatement)
        {
            IList<EsdlStatement> statements = ((EsdlBlockStatement)statement).Statements;
            if (statements == null)
            {
                return;
            }

            for (int i = 0; i < statements.Count; i++)
            {
                VisitStatement(statements[i]);
            }

            return;
        }

        if (statement is EsdlIfStatement)
        {
            EsdlIfStatement ifStatement = (EsdlIfStatement)statement;
            VisitExpression(ifStatement.Condition, false);
            VisitStatement(ifStatement.ThenStatement);
            VisitStatement(ifStatement.ElseStatement);
            return;
        }

        if (statement is EsdlWhileStatement)
        {
            EsdlWhileStatement whileStatement = (EsdlWhileStatement)statement;
            VisitExpression(whileStatement.Condition, false);
            VisitStatement(whileStatement.Body);
            return;
        }

        if (statement is EsdlDoWhileStatement)
        {
            EsdlDoWhileStatement doWhileStatement = (EsdlDoWhileStatement)statement;
            VisitStatement(doWhileStatement.Body);
            VisitExpression(doWhileStatement.Condition, false);
            return;
        }

        if (statement is EsdlForStatement)
        {
            EsdlForStatement forStatement = (EsdlForStatement)statement;
            VisitExpression(forStatement.Initializer, false);
            VisitExpression(forStatement.Condition, false);
            VisitExpression(forStatement.Increment, false);
            VisitStatement(forStatement.Body);
            return;
        }

        if (statement is EsdlSwitchStatement)
        {
            EsdlSwitchStatement switchStatement = (EsdlSwitchStatement)statement;
            VisitExpression(switchStatement.Selector, false);
            if (switchStatement.Sections == null)
            {
                return;
            }

            for (int i = 0; i < switchStatement.Sections.Count; i++)
            {
                EsdlSwitchSection section = switchStatement.Sections[i];
                if (section == null)
                {
                    continue;
                }

                if (section.Labels != null)
                {
                    for (int j = 0; j < section.Labels.Count; j++)
                    {
                        EsdlSwitchLabel label = section.Labels[j];
                        if (label != null && !label.IsDefault)
                        {
                            VisitExpression(label.Label, false);
                        }
                    }
                }

                if (section.Statements == null)
                {
                    continue;
                }

                for (int j = 0; j < section.Statements.Count; j++)
                {
                    VisitStatement(section.Statements[j]);
                }
            }
            return;
        }
    }

    private void VisitExpression(EsdlExpression expression, bool isWriteTarget)
    {
        if (expression == null)
        {
            return;
        }

        if (expression is EsdlAssignmentExpression)
        {
            EsdlAssignmentExpression assignment = (EsdlAssignmentExpression)expression;
            string writePath = TryGetPath(assignment.Left);
            if (!String.IsNullOrWhiteSpace(writePath))
            {
                AddDistinct(Writes, writePath);
                AddReferenceFromPath(writePath);
            }

            VisitExpression(assignment.Right, false);
            return;
        }

        if (expression is EsdlConditionalExpression)
        {
            EsdlConditionalExpression conditional = (EsdlConditionalExpression)expression;
            VisitExpression(conditional.Condition, false);
            VisitExpression(conditional.ThenExpression, false);
            VisitExpression(conditional.ElseExpression, false);
            return;
        }

        if (expression is EsdlIdentifierExpression)
        {
            if (!isWriteTarget)
            {
                string name = ((EsdlIdentifierExpression)expression).Name;
                if (!String.IsNullOrWhiteSpace(name))
                {
                    AddDistinct(Reads, name);
                    AddReferenceFromPath(name);
                }
            }

            return;
        }

        if (expression is EsdlMemberAccessExpression)
        {
            if (!isWriteTarget)
            {
                string path = TryGetPath(expression);
                if (!String.IsNullOrWhiteSpace(path))
                {
                    AddDistinct(Reads, path);
                    AddReferenceFromPath(path);
                }
            }

            return;
        }

        if (expression is EsdlCallExpression)
        {
            VisitCall((EsdlCallExpression)expression);
            return;
        }

        if (expression is EsdlUnaryExpression)
        {
            VisitExpression(((EsdlUnaryExpression)expression).Operand, false);
            return;
        }

        if (expression is EsdlBinaryExpression)
        {
            EsdlBinaryExpression binary = (EsdlBinaryExpression)expression;
            VisitExpression(binary.Left, false);
            VisitExpression(binary.Right, false);
            return;
        }

        if (expression is EsdlParenthesizedExpression)
        {
            VisitExpression(((EsdlParenthesizedExpression)expression).Inner, false);
        }
    }

    private void VisitCall(EsdlCallExpression call)
    {
        if (call == null)
        {
            return;
        }

        string calleePath = TryGetPath(call.Callee);
        if (!String.IsNullOrWhiteSpace(calleePath))
        {
            AddDistinct(Calls, calleePath);
            AddReferenceFromPath(calleePath);
        }
        else
        {
            VisitExpression(call.Callee, false);
        }

        if (call.Arguments == null)
        {
            return;
        }

        for (int i = 0; i < call.Arguments.Count; i++)
        {
            VisitExpression(call.Arguments[i], false);
        }
    }

    private void AddReferenceFromPath(string path)
    {
        string root = GetRootName(path);
        if (String.IsNullOrWhiteSpace(root))
        {
            return;
        }

        if (referenceNames.ContainsKey(root))
        {
            AddDistinct(ReferencedComponents, root);
        }
    }

    private string GetRootName(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        int separator = path.IndexOf('.');
        return separator < 0 ? path : path.Substring(0, separator);
    }

    private string TryGetPath(EsdlExpression expression)
    {
        if (expression == null)
        {
            return String.Empty;
        }

        if (expression is EsdlIdentifierExpression)
        {
            return ((EsdlIdentifierExpression)expression).Name ?? String.Empty;
        }

        if (expression is EsdlMemberAccessExpression)
        {
            EsdlMemberAccessExpression member = (EsdlMemberAccessExpression)expression;
            string target = TryGetPath(member.Target);
            if (String.IsNullOrWhiteSpace(target))
            {
                return String.Empty;
            }

            return target + "." + (member.Member ?? String.Empty);
        }

        return String.Empty;
    }

    private void AddDistinct(IList<string> values, string value)
    {
        if (values == null || String.IsNullOrWhiteSpace(value))
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], value, StringComparison.Ordinal))
            {
                return;
            }
        }

        values.Add(value);
    }
}

internal sealed class EsdlParser
{
    private readonly EsdlLexer lexer;
    private EsdlToken current;
    private EsdlToken previous;

    public EsdlParser(string code)
    {
        lexer = new EsdlLexer(code ?? String.Empty);
        previous = new EsdlToken(EsdlTokenKind.EndOfFile, String.Empty, 1, 1);
        current = lexer.NextToken();
    }

    public EsdlProgram ParseProgram()
    {
        List<EsdlStatement> statements = new List<EsdlStatement>();
        while (current.Kind != EsdlTokenKind.EndOfFile)
        {
            statements.Add(ParseStatement());
        }

        return new EsdlProgram(statements);
    }

    private EsdlStatement ParseStatement()
    {
        if (Match(EsdlTokenKind.Semicolon))
        {
            return new EsdlExpressionStatement(null);
        }

        if (Match(EsdlTokenKind.LeftBrace))
        {
            List<EsdlStatement> statements = new List<EsdlStatement>();
            while (!Match(EsdlTokenKind.RightBrace))
            {
                if (current.Kind == EsdlTokenKind.EndOfFile)
                {
                    throw Error("Expected '}' to close block.");
                }

                statements.Add(ParseStatement());
            }

            return new EsdlBlockStatement(statements);
        }

        if (Match(EsdlTokenKind.Return))
        {
            EsdlExpression expression = null;
            if (current.Kind != EsdlTokenKind.Semicolon && current.Kind != EsdlTokenKind.EndOfFile && current.Kind != EsdlTokenKind.RightBrace)
            {
                expression = ParseExpression();
            }

            Match(EsdlTokenKind.Semicolon);
            return new EsdlReturnStatement(expression);
        }

        if (Match(EsdlTokenKind.If))
        {
            Consume(EsdlTokenKind.LeftParen, "Expected '(' after if.");
            EsdlExpression condition = ParseExpression();
            Consume(EsdlTokenKind.RightParen, "Expected ')' after if condition.");
            EsdlStatement thenStatement = ParseStatement();
            EsdlStatement elseStatement = null;
            if (Match(EsdlTokenKind.Else))
            {
                elseStatement = ParseStatement();
            }

            return new EsdlIfStatement(condition, thenStatement, elseStatement);
        }

        if (Match(EsdlTokenKind.While))
        {
            Consume(EsdlTokenKind.LeftParen, "Expected '(' after while.");
            EsdlExpression condition = ParseExpression();
            Consume(EsdlTokenKind.RightParen, "Expected ')' after while condition.");
            return new EsdlWhileStatement(condition, ParseStatement());
        }

        if (Match(EsdlTokenKind.Do))
        {
            EsdlStatement body = ParseStatement();
            Consume(EsdlTokenKind.While, "Expected 'while' after do body.");
            Consume(EsdlTokenKind.LeftParen, "Expected '(' after while.");
            EsdlExpression condition = ParseExpression();
            Consume(EsdlTokenKind.RightParen, "Expected ')' after do-while condition.");
            Match(EsdlTokenKind.Semicolon);
            return new EsdlDoWhileStatement(condition, body);
        }

        if (Match(EsdlTokenKind.For))
        {
            Consume(EsdlTokenKind.LeftParen, "Expected '(' after for.");
            EsdlExpression initializer = null;
            if (current.Kind != EsdlTokenKind.Semicolon)
            {
                initializer = ParseExpression();
            }

            Consume(EsdlTokenKind.Semicolon, "Expected ';' after for initializer.");

            EsdlExpression condition = null;
            if (current.Kind != EsdlTokenKind.Semicolon)
            {
                condition = ParseExpression();
            }

            Consume(EsdlTokenKind.Semicolon, "Expected ';' after for condition.");

            EsdlExpression increment = null;
            if (current.Kind != EsdlTokenKind.RightParen)
            {
                increment = ParseExpression();
            }

            Consume(EsdlTokenKind.RightParen, "Expected ')' after for clauses.");
            return new EsdlForStatement(initializer, condition, increment, ParseStatement());
        }

        if (Match(EsdlTokenKind.Switch))
        {
            Consume(EsdlTokenKind.LeftParen, "Expected '(' after switch.");
            EsdlExpression selector = ParseExpression();
            Consume(EsdlTokenKind.RightParen, "Expected ')' after switch selector.");
            Consume(EsdlTokenKind.LeftBrace, "Expected '{' after switch selector.");

            List<EsdlSwitchSection> sections = new List<EsdlSwitchSection>();
            while (!Match(EsdlTokenKind.RightBrace))
            {
                if (current.Kind == EsdlTokenKind.EndOfFile)
                {
                    throw Error("Expected '}' to close switch.");
                }

                sections.Add(ParseSwitchSection());
            }

            return new EsdlSwitchStatement(selector, sections);
        }

        if (Match(EsdlTokenKind.Break))
        {
            Match(EsdlTokenKind.Semicolon);
            return new EsdlBreakStatement();
        }

        EsdlExpression expressionStatement = ParseExpression();
        Match(EsdlTokenKind.Semicolon);
        return new EsdlExpressionStatement(expressionStatement);
    }

    private EsdlExpression ParseExpression()
    {
        return ParseAssignment();
    }

    private EsdlExpression ParseAssignment()
    {
        EsdlExpression left = ParseConditional();
        if (Match(EsdlTokenKind.Assign))
        {
            EsdlExpression right = ParseAssignment();
            return new EsdlAssignmentExpression(left, right);
        }

        return left;
    }

    private EsdlExpression ParseConditional()
    {
        EsdlExpression condition = ParseLogicalOr();
        if (!Match(EsdlTokenKind.Question))
        {
            return condition;
        }

        EsdlExpression thenExpression = ParseExpression();
        Consume(EsdlTokenKind.Colon, "Expected ':' after ternary true expression.");
        EsdlExpression elseExpression = ParseConditional();
        return new EsdlConditionalExpression(condition, thenExpression, elseExpression);
    }

    private EsdlExpression ParseLogicalOr()
    {
        EsdlExpression expression = ParseLogicalAnd();
        while (Match(EsdlTokenKind.OrOr))
        {
            expression = new EsdlBinaryExpression("||", expression, ParseLogicalAnd());
        }

        return expression;
    }

    private EsdlExpression ParseLogicalAnd()
    {
        EsdlExpression expression = ParseEquality();
        while (Match(EsdlTokenKind.AndAnd))
        {
            expression = new EsdlBinaryExpression("&&", expression, ParseEquality());
        }

        return expression;
    }

    private EsdlExpression ParseEquality()
    {
        EsdlExpression expression = ParseComparison();
        while (current.Kind == EsdlTokenKind.EqualEqual || current.Kind == EsdlTokenKind.BangEqual)
        {
            string op = current.Text;
            Advance();
            expression = new EsdlBinaryExpression(op, expression, ParseComparison());
        }

        return expression;
    }

    private EsdlExpression ParseComparison()
    {
        EsdlExpression expression = ParseAdditive();
        while (current.Kind == EsdlTokenKind.Less || current.Kind == EsdlTokenKind.LessEqual || current.Kind == EsdlTokenKind.Greater || current.Kind == EsdlTokenKind.GreaterEqual)
        {
            string op = current.Text;
            Advance();
            expression = new EsdlBinaryExpression(op, expression, ParseAdditive());
        }

        return expression;
    }

    private EsdlExpression ParseAdditive()
    {
        EsdlExpression expression = ParseMultiplicative();
        while (current.Kind == EsdlTokenKind.Plus || current.Kind == EsdlTokenKind.Minus)
        {
            string op = current.Text;
            Advance();
            expression = new EsdlBinaryExpression(op, expression, ParseMultiplicative());
        }

        return expression;
    }

    private EsdlExpression ParseMultiplicative()
    {
        EsdlExpression expression = ParseUnary();
        while (current.Kind == EsdlTokenKind.Star || current.Kind == EsdlTokenKind.Slash || current.Kind == EsdlTokenKind.Percent)
        {
            string op = current.Text;
            Advance();
            expression = new EsdlBinaryExpression(op, expression, ParseUnary());
        }

        return expression;
    }

    private EsdlExpression ParseUnary()
    {
        if (current.Kind == EsdlTokenKind.Bang || current.Kind == EsdlTokenKind.Minus || current.Kind == EsdlTokenKind.Plus)
        {
            string op = current.Text;
            Advance();
            return new EsdlUnaryExpression(op, ParseUnary());
        }

        return ParsePostfix();
    }

    private EsdlExpression ParsePostfix()
    {
        EsdlExpression expression = ParsePrimary();
        while (true)
        {
            if (Match(EsdlTokenKind.Dot))
            {
                EsdlToken identifier = Consume(EsdlTokenKind.Identifier, "Expected identifier after '.'.");
                expression = new EsdlMemberAccessExpression(expression, identifier.Text);
                continue;
            }

            if (Match(EsdlTokenKind.LeftParen))
            {
                List<EsdlExpression> arguments = new List<EsdlExpression>();
                if (!Match(EsdlTokenKind.RightParen))
                {
                    do
                    {
                        arguments.Add(ParseExpression());
                    }
                    while (Match(EsdlTokenKind.Comma));

                    Consume(EsdlTokenKind.RightParen, "Expected ')' after argument list.");
                }

                expression = new EsdlCallExpression(expression, arguments);
                continue;
            }

            return expression;
        }
    }

    private EsdlExpression ParsePrimary()
    {
        if (Match(EsdlTokenKind.Identifier))
        {
            return new EsdlIdentifierExpression(Previous().Text);
        }

        if (Match(EsdlTokenKind.Number) || Match(EsdlTokenKind.String) || Match(EsdlTokenKind.True) || Match(EsdlTokenKind.False))
        {
            return new EsdlLiteralExpression(Previous().Text);
        }

        if (Match(EsdlTokenKind.LeftParen))
        {
            EsdlExpression inner = ParseExpression();
            Consume(EsdlTokenKind.RightParen, "Expected ')' after expression.");
            return new EsdlParenthesizedExpression(inner);
        }

        throw Error("Unexpected token '" + current.Text + "'.");
    }

    private bool Match(EsdlTokenKind kind)
    {
        if (current.Kind != kind)
        {
            return false;
        }

        Advance();
        return true;
    }

    private EsdlToken Consume(EsdlTokenKind kind, string message)
    {
        if (current.Kind == kind)
        {
            EsdlToken token = current;
            Advance();
            return token;
        }

        throw Error(message);
    }

    private void Advance()
    {
        previous = current;
        current = lexer.NextToken();
    }

    private EsdlToken Previous()
    {
        return previous;
    }

    private EsdlParseException Error(string message)
    {
        return new EsdlParseException(message + " (line " + current.Line.ToString(CultureInfo.InvariantCulture) + ", col " + current.Column.ToString(CultureInfo.InvariantCulture) + ")");
    }

    private EsdlSwitchSection ParseSwitchSection()
    {
        List<EsdlSwitchLabel> labels = new List<EsdlSwitchLabel>();
        while (current.Kind == EsdlTokenKind.Case || current.Kind == EsdlTokenKind.Default)
        {
            if (Match(EsdlTokenKind.Case))
            {
                EsdlExpression labelExpression = ParseExpression();
                Consume(EsdlTokenKind.Colon, "Expected ':' after case label.");
                labels.Add(new EsdlSwitchLabel(false, labelExpression));
                continue;
            }

            Consume(EsdlTokenKind.Default, "Expected switch label.");
            Consume(EsdlTokenKind.Colon, "Expected ':' after default label.");
            labels.Add(new EsdlSwitchLabel(true, null));
        }

        if (labels.Count == 0)
        {
            throw Error("Expected case or default label in switch.");
        }

        List<EsdlStatement> statements = new List<EsdlStatement>();
        while (current.Kind != EsdlTokenKind.Case &&
            current.Kind != EsdlTokenKind.Default &&
            current.Kind != EsdlTokenKind.RightBrace &&
            current.Kind != EsdlTokenKind.EndOfFile)
        {
            statements.Add(ParseStatement());
        }

        return new EsdlSwitchSection(labels, statements);
    }
}

internal sealed class EsdlLexer
{
    private readonly string code;
    private int index;
    private int line;
    private int column;

    public EsdlLexer(string code)
    {
        this.code = code ?? String.Empty;
        line = 1;
        column = 1;
        PreviousToken = new EsdlToken(EsdlTokenKind.EndOfFile, String.Empty, 1, 1);
    }

    public EsdlToken PreviousToken { get; private set; }

    public EsdlToken NextToken()
    {
        SkipWhitespaceAndComments();
        int tokenLine = line;
        int tokenColumn = column;

        if (IsAtEnd())
        {
            PreviousToken = new EsdlToken(EsdlTokenKind.EndOfFile, String.Empty, tokenLine, tokenColumn);
            return PreviousToken;
        }

        char c = Advance();
        EsdlToken token;
        switch (c)
        {
            case '(': token = CreateToken(EsdlTokenKind.LeftParen, "(", tokenLine, tokenColumn); break;
            case ')': token = CreateToken(EsdlTokenKind.RightParen, ")", tokenLine, tokenColumn); break;
            case '{': token = CreateToken(EsdlTokenKind.LeftBrace, "{", tokenLine, tokenColumn); break;
            case '}': token = CreateToken(EsdlTokenKind.RightBrace, "}", tokenLine, tokenColumn); break;
            case ',': token = CreateToken(EsdlTokenKind.Comma, ",", tokenLine, tokenColumn); break;
            case ';': token = CreateToken(EsdlTokenKind.Semicolon, ";", tokenLine, tokenColumn); break;
            case ':': token = CreateToken(EsdlTokenKind.Colon, ":", tokenLine, tokenColumn); break;
            case '?': token = CreateToken(EsdlTokenKind.Question, "?", tokenLine, tokenColumn); break;
            case '.': token = CreateToken(EsdlTokenKind.Dot, ".", tokenLine, tokenColumn); break;
            case '+': token = CreateToken(EsdlTokenKind.Plus, "+", tokenLine, tokenColumn); break;
            case '-': token = CreateToken(EsdlTokenKind.Minus, "-", tokenLine, tokenColumn); break;
            case '*': token = CreateToken(EsdlTokenKind.Star, "*", tokenLine, tokenColumn); break;
            case '%': token = CreateToken(EsdlTokenKind.Percent, "%", tokenLine, tokenColumn); break;
            case '!': token = CreateToken(Match('=') ? EsdlTokenKind.BangEqual : EsdlTokenKind.Bang, MatchConsumedText('!', '=') , tokenLine, tokenColumn); break;
            case '=': token = CreateToken(Match('=') ? EsdlTokenKind.EqualEqual : EsdlTokenKind.Assign, MatchConsumedText('=', '=') , tokenLine, tokenColumn); break;
            case '<': token = CreateToken(Match('=') ? EsdlTokenKind.LessEqual : EsdlTokenKind.Less, MatchConsumedText('<', '=') , tokenLine, tokenColumn); break;
            case '>': token = CreateToken(Match('=') ? EsdlTokenKind.GreaterEqual : EsdlTokenKind.Greater, MatchConsumedText('>', '=') , tokenLine, tokenColumn); break;
            case '&':
                if (!Match('&'))
                {
                    throw new EsdlParseException("Unexpected '&' at line " + tokenLine.ToString(CultureInfo.InvariantCulture) + ", col " + tokenColumn.ToString(CultureInfo.InvariantCulture) + ".");
                }
                token = CreateToken(EsdlTokenKind.AndAnd, "&&", tokenLine, tokenColumn);
                break;
            case '|':
                if (!Match('|'))
                {
                    throw new EsdlParseException("Unexpected '|' at line " + tokenLine.ToString(CultureInfo.InvariantCulture) + ", col " + tokenColumn.ToString(CultureInfo.InvariantCulture) + ".");
                }
                token = CreateToken(EsdlTokenKind.OrOr, "||", tokenLine, tokenColumn);
                break;
            case '/':
                token = CreateToken(EsdlTokenKind.Slash, "/", tokenLine, tokenColumn);
                break;
            case '"':
                token = ReadString(tokenLine, tokenColumn);
                break;
            default:
                if (IsIdentifierStart(c))
                {
                    token = ReadIdentifier(c, tokenLine, tokenColumn);
                    break;
                }

                if (Char.IsDigit(c))
                {
                    token = ReadNumber(c, tokenLine, tokenColumn);
                    break;
                }

                throw new EsdlParseException("Unexpected character '" + c.ToString() + "' at line " + tokenLine.ToString(CultureInfo.InvariantCulture) + ", col " + tokenColumn.ToString(CultureInfo.InvariantCulture) + ".");
        }

        PreviousToken = token;
        return token;
    }

    private string MatchConsumedText(char first, char second)
    {
        return index > 0 && code[index - 1] == second ? new string(new[] { first, second }) : new string(new[] { first });
    }

    private EsdlToken ReadIdentifier(char first, int tokenLine, int tokenColumn)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append(first);
        while (!IsAtEnd() && IsIdentifierPart(Peek()))
        {
            builder.Append(Advance());
        }

        string text = builder.ToString();
        EsdlTokenKind kind;
        switch (text)
        {
            case "return": kind = EsdlTokenKind.Return; break;
            case "if": kind = EsdlTokenKind.If; break;
            case "else": kind = EsdlTokenKind.Else; break;
            case "while": kind = EsdlTokenKind.While; break;
            case "do": kind = EsdlTokenKind.Do; break;
            case "for": kind = EsdlTokenKind.For; break;
            case "switch": kind = EsdlTokenKind.Switch; break;
            case "case": kind = EsdlTokenKind.Case; break;
            case "default": kind = EsdlTokenKind.Default; break;
            case "break": kind = EsdlTokenKind.Break; break;
            case "true": kind = EsdlTokenKind.True; break;
            case "false": kind = EsdlTokenKind.False; break;
            default: kind = EsdlTokenKind.Identifier; break;
        }

        return CreateToken(kind, text, tokenLine, tokenColumn);
    }

    private EsdlToken ReadNumber(char first, int tokenLine, int tokenColumn)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append(first);
        while (!IsAtEnd() && (Char.IsDigit(Peek()) || Peek() == '.'))
        {
            builder.Append(Advance());
        }

        return CreateToken(EsdlTokenKind.Number, builder.ToString(), tokenLine, tokenColumn);
    }

    private EsdlToken ReadString(int tokenLine, int tokenColumn)
    {
        StringBuilder builder = new StringBuilder();
        while (!IsAtEnd())
        {
            char c = Advance();
            if (c == '"')
            {
                return CreateToken(EsdlTokenKind.String, builder.ToString(), tokenLine, tokenColumn);
            }

            if (c == '\\' && !IsAtEnd())
            {
                builder.Append(c);
                builder.Append(Advance());
                continue;
            }

            builder.Append(c);
        }

        throw new EsdlParseException("Unterminated string literal at line " + tokenLine.ToString(CultureInfo.InvariantCulture) + ", col " + tokenColumn.ToString(CultureInfo.InvariantCulture) + ".");
    }

    private void SkipWhitespaceAndComments()
    {
        while (!IsAtEnd())
        {
            char c = Peek();
            if (Char.IsWhiteSpace(c))
            {
                Advance();
                continue;
            }

            if (c == '/' && PeekNext() == '/')
            {
                Advance();
                Advance();
                while (!IsAtEnd() && Peek() != '\n')
                {
                    Advance();
                }
                continue;
            }

            if (c == '/' && PeekNext() == '*')
            {
                Advance();
                Advance();
                while (!IsAtEnd())
                {
                    if (Peek() == '*' && PeekNext() == '/')
                    {
                        Advance();
                        Advance();
                        break;
                    }

                    Advance();
                }
                continue;
            }

            break;
        }
    }

    private EsdlToken CreateToken(EsdlTokenKind kind, string text, int tokenLine, int tokenColumn)
    {
        return new EsdlToken(kind, text, tokenLine, tokenColumn);
    }

    private bool Match(char expected)
    {
        if (IsAtEnd() || Peek() != expected)
        {
            return false;
        }

        Advance();
        return true;
    }

    private char Advance()
    {
        char value = code[index++];
        if (value == '\n')
        {
            line++;
            column = 1;
        }
        else
        {
            column++;
        }

        return value;
    }

    private char Peek()
    {
        return IsAtEnd() ? '\0' : code[index];
    }

    private char PeekNext()
    {
        return index + 1 >= code.Length ? '\0' : code[index + 1];
    }

    private bool IsAtEnd()
    {
        return index >= code.Length;
    }

    private bool IsIdentifierStart(char value)
    {
        return Char.IsLetter(value) || value == '_';
    }

    private bool IsIdentifierPart(char value)
    {
        return Char.IsLetterOrDigit(value) || value == '_';
    }
}

internal sealed class EsdlParseException : Exception
{
    public EsdlParseException(string message)
        : base(message)
    {
    }
}

internal enum EsdlTokenKind
{
    EndOfFile,
    Identifier,
    Number,
    String,
    True,
    False,
    Return,
    If,
    Else,
    While,
    Do,
    For,
    Switch,
    Case,
    Default,
    Break,
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    Comma,
    Semicolon,
    Colon,
    Question,
    Dot,
    Assign,
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Bang,
    AndAnd,
    OrOr,
    EqualEqual,
    BangEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual
}

internal sealed class EsdlToken
{
    public EsdlToken(EsdlTokenKind kind, string text, int line, int column)
    {
        Kind = kind;
        Text = text;
        Line = line;
        Column = column;
    }

    public EsdlTokenKind Kind { get; private set; }
    public string Text { get; private set; }
    public int Line { get; private set; }
    public int Column { get; private set; }
}

internal sealed class EsdlProgram
{
    public EsdlProgram(IList<EsdlStatement> statements)
    {
        Statements = statements;
    }

    public IList<EsdlStatement> Statements { get; private set; }
}

internal abstract class EsdlStatement
{
}

internal sealed class EsdlExpressionStatement : EsdlStatement
{
    public EsdlExpressionStatement(EsdlExpression expression)
    {
        Expression = expression;
    }

    public EsdlExpression Expression { get; private set; }
}

internal sealed class EsdlReturnStatement : EsdlStatement
{
    public EsdlReturnStatement(EsdlExpression expression)
    {
        Expression = expression;
    }

    public EsdlExpression Expression { get; private set; }
}

internal sealed class EsdlBlockStatement : EsdlStatement
{
    public EsdlBlockStatement(IList<EsdlStatement> statements)
    {
        Statements = statements;
    }

    public IList<EsdlStatement> Statements { get; private set; }
}

internal sealed class EsdlIfStatement : EsdlStatement
{
    public EsdlIfStatement(EsdlExpression condition, EsdlStatement thenStatement, EsdlStatement elseStatement)
    {
        Condition = condition;
        ThenStatement = thenStatement;
        ElseStatement = elseStatement;
    }

    public EsdlExpression Condition { get; private set; }
    public EsdlStatement ThenStatement { get; private set; }
    public EsdlStatement ElseStatement { get; private set; }
}

internal sealed class EsdlWhileStatement : EsdlStatement
{
    public EsdlWhileStatement(EsdlExpression condition, EsdlStatement body)
    {
        Condition = condition;
        Body = body;
    }

    public EsdlExpression Condition { get; private set; }
    public EsdlStatement Body { get; private set; }
}

internal sealed class EsdlDoWhileStatement : EsdlStatement
{
    public EsdlDoWhileStatement(EsdlExpression condition, EsdlStatement body)
    {
        Condition = condition;
        Body = body;
    }

    public EsdlExpression Condition { get; private set; }
    public EsdlStatement Body { get; private set; }
}

internal sealed class EsdlForStatement : EsdlStatement
{
    public EsdlForStatement(EsdlExpression initializer, EsdlExpression condition, EsdlExpression increment, EsdlStatement body)
    {
        Initializer = initializer;
        Condition = condition;
        Increment = increment;
        Body = body;
    }

    public EsdlExpression Initializer { get; private set; }
    public EsdlExpression Condition { get; private set; }
    public EsdlExpression Increment { get; private set; }
    public EsdlStatement Body { get; private set; }
}

internal sealed class EsdlSwitchStatement : EsdlStatement
{
    public EsdlSwitchStatement(EsdlExpression selector, IList<EsdlSwitchSection> sections)
    {
        Selector = selector;
        Sections = sections;
    }

    public EsdlExpression Selector { get; private set; }
    public IList<EsdlSwitchSection> Sections { get; private set; }
}

internal sealed class EsdlSwitchSection
{
    public EsdlSwitchSection(IList<EsdlSwitchLabel> labels, IList<EsdlStatement> statements)
    {
        Labels = labels;
        Statements = statements;
    }

    public IList<EsdlSwitchLabel> Labels { get; private set; }
    public IList<EsdlStatement> Statements { get; private set; }
}

internal sealed class EsdlSwitchLabel
{
    public EsdlSwitchLabel(bool isDefault, EsdlExpression label)
    {
        IsDefault = isDefault;
        Label = label;
    }

    public bool IsDefault { get; private set; }
    public EsdlExpression Label { get; private set; }
}

internal sealed class EsdlBreakStatement : EsdlStatement
{
}

internal abstract class EsdlExpression
{
}

internal sealed class EsdlIdentifierExpression : EsdlExpression
{
    public EsdlIdentifierExpression(string name)
    {
        Name = name;
    }

    public string Name { get; private set; }
}

internal sealed class EsdlLiteralExpression : EsdlExpression
{
    public EsdlLiteralExpression(string value)
    {
        Value = value;
    }

    public string Value { get; private set; }
}

internal sealed class EsdlParenthesizedExpression : EsdlExpression
{
    public EsdlParenthesizedExpression(EsdlExpression inner)
    {
        Inner = inner;
    }

    public EsdlExpression Inner { get; private set; }
}

internal sealed class EsdlUnaryExpression : EsdlExpression
{
    public EsdlUnaryExpression(string op, EsdlExpression operand)
    {
        Operator = op;
        Operand = operand;
    }

    public string Operator { get; private set; }
    public EsdlExpression Operand { get; private set; }
}

internal sealed class EsdlBinaryExpression : EsdlExpression
{
    public EsdlBinaryExpression(string op, EsdlExpression left, EsdlExpression right)
    {
        Operator = op;
        Left = left;
        Right = right;
    }

    public string Operator { get; private set; }
    public EsdlExpression Left { get; private set; }
    public EsdlExpression Right { get; private set; }
}

internal sealed class EsdlAssignmentExpression : EsdlExpression
{
    public EsdlAssignmentExpression(EsdlExpression left, EsdlExpression right)
    {
        Left = left;
        Right = right;
    }

    public EsdlExpression Left { get; private set; }
    public EsdlExpression Right { get; private set; }
}

internal sealed class EsdlConditionalExpression : EsdlExpression
{
    public EsdlConditionalExpression(EsdlExpression condition, EsdlExpression thenExpression, EsdlExpression elseExpression)
    {
        Condition = condition;
        ThenExpression = thenExpression;
        ElseExpression = elseExpression;
    }

    public EsdlExpression Condition { get; private set; }
    public EsdlExpression ThenExpression { get; private set; }
    public EsdlExpression ElseExpression { get; private set; }
}

internal sealed class EsdlMemberAccessExpression : EsdlExpression
{
    public EsdlMemberAccessExpression(EsdlExpression target, string member)
    {
        Target = target;
        Member = member;
    }

    public EsdlExpression Target { get; private set; }
    public string Member { get; private set; }
}

internal sealed class EsdlCallExpression : EsdlExpression
{
    public EsdlCallExpression(EsdlExpression callee, IList<EsdlExpression> arguments)
    {
        Callee = callee;
        Arguments = arguments;
    }

    public EsdlExpression Callee { get; private set; }
    public IList<EsdlExpression> Arguments { get; private set; }
}
