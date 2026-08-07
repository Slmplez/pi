using System;
using System.Collections.Generic;

public sealed class AscetEsdlCoverageModel
{
    public bool ParseSucceeded { get; set; }
    public IList<AscetCoverageStatementRef> Statements { get; set; }
    public IList<AscetCoverageDecisionRef> Decisions { get; set; }
    public IList<AscetCoverageConditionRef> Conditions { get; set; }
    public IList<AscetCoverageSwitchRef> Switches { get; set; }
    public IList<string> Diagnostics { get; set; }
}

public sealed class AscetCoverageStatementRef
{
    public string Id { get; set; }
    public string Kind { get; set; }
    public string Text { get; set; }
}

public sealed class AscetCoverageDecisionRef
{
    public string Id { get; set; }
    public string Kind { get; set; }
    public string ConditionText { get; set; }
    public IList<string> ConditionIDs { get; set; }
}

public sealed class AscetCoverageConditionRef
{
    public string Id { get; set; }
    public string DecisionID { get; set; }
    public string Text { get; set; }
}

public sealed class AscetCoverageSwitchRef
{
    public string Id { get; set; }
    public string SelectorText { get; set; }
    public IList<AscetCoverageSwitchLabelRef> Labels { get; set; }
}

public sealed class AscetCoverageSwitchLabelRef
{
    public string Id { get; set; }
    public string SwitchID { get; set; }
    public bool IsDefault { get; set; }
    public string LabelText { get; set; }
}

public interface IEsdlCoverageModelService
{
    AscetEsdlCoverageModel BuildModel(string code);
}

public sealed class EsdlCoverageModelService : IEsdlCoverageModelService
{
    public AscetEsdlCoverageModel BuildModel(string code)
    {
        AscetEsdlCoverageModel result = CreateEmptyModel();
        try
        {
            EsdlParser parser = new EsdlParser(code ?? String.Empty);
            EsdlProgram program = parser.ParseProgram();
            EsdlCoverageCollector collector = new EsdlCoverageCollector();
            collector.VisitProgram(program);

            result.ParseSucceeded = true;
            result.Statements = collector.Statements;
            result.Decisions = collector.Decisions;
            result.Conditions = collector.Conditions;
            result.Switches = collector.Switches;
            return result;
        }
        catch (EsdlParseException ex)
        {
            result.Diagnostics.Add(ex.Message);
            return result;
        }
    }

    private AscetEsdlCoverageModel CreateEmptyModel()
    {
        return new AscetEsdlCoverageModel
        {
            ParseSucceeded = false,
            Statements = new List<AscetCoverageStatementRef>(),
            Decisions = new List<AscetCoverageDecisionRef>(),
            Conditions = new List<AscetCoverageConditionRef>(),
            Switches = new List<AscetCoverageSwitchRef>(),
            Diagnostics = new List<string>()
        };
    }
}

internal sealed class EsdlCoverageCollector
{
    private int statementCounter;
    private int decisionCounter;
    private int switchCounter;

    public EsdlCoverageCollector()
    {
        Statements = new List<AscetCoverageStatementRef>();
        Decisions = new List<AscetCoverageDecisionRef>();
        Conditions = new List<AscetCoverageConditionRef>();
        Switches = new List<AscetCoverageSwitchRef>();
    }

    public List<AscetCoverageStatementRef> Statements { get; private set; }
    public List<AscetCoverageDecisionRef> Decisions { get; private set; }
    public List<AscetCoverageConditionRef> Conditions { get; private set; }
    public List<AscetCoverageSwitchRef> Switches { get; private set; }

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
            EsdlExpression expression = ((EsdlExpressionStatement)statement).Expression;
            if (expression != null)
            {
                AddStatement("expression", expression);
                VisitExpression(expression);
            }
            return;
        }

        if (statement is EsdlReturnStatement)
        {
            EsdlExpression expression = ((EsdlReturnStatement)statement).Expression;
            AddStatement("return", expression);
            VisitExpression(expression);
            return;
        }

        if (statement is EsdlBreakStatement)
        {
            AddStatement("break", null);
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
            AddDecision("if", ifStatement.Condition);
            VisitStatement(ifStatement.ThenStatement);
            VisitStatement(ifStatement.ElseStatement);
            return;
        }

        if (statement is EsdlWhileStatement)
        {
            EsdlWhileStatement whileStatement = (EsdlWhileStatement)statement;
            AddDecision("while", whileStatement.Condition);
            VisitStatement(whileStatement.Body);
            return;
        }

        if (statement is EsdlDoWhileStatement)
        {
            EsdlDoWhileStatement doWhileStatement = (EsdlDoWhileStatement)statement;
            VisitStatement(doWhileStatement.Body);
            AddDecision("doWhile", doWhileStatement.Condition);
            return;
        }

        if (statement is EsdlForStatement)
        {
            EsdlForStatement forStatement = (EsdlForStatement)statement;
            if (forStatement.Initializer != null)
            {
                AddStatement("forInit", forStatement.Initializer);
                VisitExpression(forStatement.Initializer);
            }
            if (forStatement.Condition != null)
            {
                AddDecision("for", forStatement.Condition);
            }
            if (forStatement.Increment != null)
            {
                AddStatement("forIncrement", forStatement.Increment);
                VisitExpression(forStatement.Increment);
            }
            VisitStatement(forStatement.Body);
            return;
        }

        if (statement is EsdlSwitchStatement)
        {
            VisitSwitch((EsdlSwitchStatement)statement);
        }
    }

    private void VisitSwitch(EsdlSwitchStatement switchStatement)
    {
        if (switchStatement == null)
        {
            return;
        }

        switchCounter++;
        string switchID = "SW" + switchCounter.ToString("000");
        List<AscetCoverageSwitchLabelRef> labels = new List<AscetCoverageSwitchLabelRef>();
        int labelCounter = 0;

        if (switchStatement.Sections != null)
        {
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
                        if (label == null)
                        {
                            continue;
                        }

                        labelCounter++;
                        labels.Add(new AscetCoverageSwitchLabelRef
                        {
                            Id = switchID + ".L" + labelCounter.ToString("00"),
                            SwitchID = switchID,
                            IsDefault = label.IsDefault,
                            LabelText = label.IsDefault ? "default" : EsdlSyntaxFormatter.FormatExpression(label.Label)
                        });
                    }
                }

                if (section.Statements != null)
                {
                    for (int j = 0; j < section.Statements.Count; j++)
                    {
                        VisitStatement(section.Statements[j]);
                    }
                }
            }
        }

        Switches.Add(new AscetCoverageSwitchRef
        {
            Id = switchID,
            SelectorText = EsdlSyntaxFormatter.FormatExpression(switchStatement.Selector),
            Labels = labels
        });
    }

    private void VisitExpression(EsdlExpression expression)
    {
        if (expression == null)
        {
            return;
        }

        if (expression is EsdlAssignmentExpression)
        {
            EsdlAssignmentExpression assignment = (EsdlAssignmentExpression)expression;
            VisitExpression(assignment.Left);
            VisitExpression(assignment.Right);
            return;
        }

        if (expression is EsdlConditionalExpression)
        {
            EsdlConditionalExpression conditional = (EsdlConditionalExpression)expression;
            AddDecision("ternary", conditional.Condition);
            VisitExpression(conditional.ThenExpression);
            VisitExpression(conditional.ElseExpression);
            return;
        }

        if (expression is EsdlCallExpression)
        {
            EsdlCallExpression call = (EsdlCallExpression)expression;
            VisitExpression(call.Callee);
            if (call.Arguments != null)
            {
                for (int i = 0; i < call.Arguments.Count; i++)
                {
                    VisitExpression(call.Arguments[i]);
                }
            }
            return;
        }

        if (expression is EsdlUnaryExpression)
        {
            VisitExpression(((EsdlUnaryExpression)expression).Operand);
            return;
        }

        if (expression is EsdlBinaryExpression)
        {
            EsdlBinaryExpression binary = (EsdlBinaryExpression)expression;
            VisitExpression(binary.Left);
            VisitExpression(binary.Right);
            return;
        }

        if (expression is EsdlParenthesizedExpression)
        {
            VisitExpression(((EsdlParenthesizedExpression)expression).Inner);
        }
    }

    private void AddStatement(string kind, EsdlExpression expression)
    {
        statementCounter++;
        Statements.Add(new AscetCoverageStatementRef
        {
            Id = "S" + statementCounter.ToString("000"),
            Kind = kind ?? String.Empty,
            Text = expression == null ? String.Empty : EsdlSyntaxFormatter.FormatExpression(expression)
        });
    }

    private void AddDecision(string kind, EsdlExpression condition)
    {
        if (condition == null)
        {
            return;
        }

        decisionCounter++;
        string decisionID = "D" + decisionCounter.ToString("000");
        List<string> conditionIDs = new List<string>();
        List<string> atomics = new List<string>();
        CollectAtomicConditions(condition, atomics);

        for (int i = 0; i < atomics.Count; i++)
        {
            string conditionID = decisionID + ".C" + (i + 1).ToString("00");
            conditionIDs.Add(conditionID);
            Conditions.Add(new AscetCoverageConditionRef
            {
                Id = conditionID,
                DecisionID = decisionID,
                Text = atomics[i]
            });
        }

        Decisions.Add(new AscetCoverageDecisionRef
        {
            Id = decisionID,
            Kind = kind ?? String.Empty,
            ConditionText = EsdlSyntaxFormatter.FormatExpression(condition),
            ConditionIDs = conditionIDs
        });
    }

    private void CollectAtomicConditions(EsdlExpression expression, IList<string> atomics)
    {
        if (expression == null || atomics == null)
        {
            return;
        }

        if (expression is EsdlParenthesizedExpression)
        {
            CollectAtomicConditions(((EsdlParenthesizedExpression)expression).Inner, atomics);
            return;
        }

        if (expression is EsdlBinaryExpression)
        {
            EsdlBinaryExpression binary = (EsdlBinaryExpression)expression;
            if (String.Equals(binary.Operator, "&&", StringComparison.Ordinal) ||
                String.Equals(binary.Operator, "||", StringComparison.Ordinal))
            {
                CollectAtomicConditions(binary.Left, atomics);
                CollectAtomicConditions(binary.Right, atomics);
                return;
            }
        }

        atomics.Add(EsdlSyntaxFormatter.FormatExpression(expression));
    }
}

internal static class EsdlSyntaxFormatter
{
    public static string FormatExpression(EsdlExpression expression)
    {
        if (expression == null)
        {
            return String.Empty;
        }

        if (expression is EsdlIdentifierExpression)
        {
            return ((EsdlIdentifierExpression)expression).Name ?? String.Empty;
        }

        if (expression is EsdlLiteralExpression)
        {
            return ((EsdlLiteralExpression)expression).Value ?? String.Empty;
        }

        if (expression is EsdlParenthesizedExpression)
        {
            return "(" + FormatExpression(((EsdlParenthesizedExpression)expression).Inner) + ")";
        }

        if (expression is EsdlUnaryExpression)
        {
            EsdlUnaryExpression unary = (EsdlUnaryExpression)expression;
            return (unary.Operator ?? String.Empty) + FormatExpression(unary.Operand);
        }

        if (expression is EsdlBinaryExpression)
        {
            EsdlBinaryExpression binary = (EsdlBinaryExpression)expression;
            return FormatExpression(binary.Left) + " " + (binary.Operator ?? String.Empty) + " " + FormatExpression(binary.Right);
        }

        if (expression is EsdlAssignmentExpression)
        {
            EsdlAssignmentExpression assignment = (EsdlAssignmentExpression)expression;
            return FormatExpression(assignment.Left) + " = " + FormatExpression(assignment.Right);
        }

        if (expression is EsdlMemberAccessExpression)
        {
            EsdlMemberAccessExpression member = (EsdlMemberAccessExpression)expression;
            return FormatExpression(member.Target) + "." + (member.Member ?? String.Empty);
        }

        if (expression is EsdlCallExpression)
        {
            EsdlCallExpression call = (EsdlCallExpression)expression;
            List<string> parts = new List<string>();
            if (call.Arguments != null)
            {
                for (int i = 0; i < call.Arguments.Count; i++)
                {
                    parts.Add(FormatExpression(call.Arguments[i]));
                }
            }

            return FormatExpression(call.Callee) + "(" + String.Join(", ", parts.ToArray()) + ")";
        }

        if (expression is EsdlConditionalExpression)
        {
            EsdlConditionalExpression conditional = (EsdlConditionalExpression)expression;
            return FormatExpression(conditional.Condition) + " ? " + FormatExpression(conditional.ThenExpression) + " : " + FormatExpression(conditional.ElseExpression);
        }

        return expression.ToString();
    }
}
