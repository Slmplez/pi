using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

public sealed class MethodCodeConsistencyRequest
{
    public MethodCodeConsistencyRequest()
    {
        ComponentPath = String.Empty;
        MethodName = String.Empty;
        ExpectedCode = String.Empty;
        ActualCode = String.Empty;
        Elements = new List<AscetElementSpec>();
        MethodNames = new List<string>();
        SignatureNames = new List<string>();
    }

    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string ExpectedCode { get; set; }
    public string ActualCode { get; set; }
    public IList<AscetElementSpec> Elements { get; set; }
    public IList<string> MethodNames { get; set; }
    public IList<string> SignatureNames { get; set; }
}

public sealed class MethodCodeConsistencyResult
{
    public MethodCodeConsistencyResult()
    {
        ReferencedElements = new List<string>();
    }

    public IList<string> ReferencedElements { get; set; }
}

public static class MethodCodeConsistencyValidator
{
    private static readonly Regex IdentifierPattern = new Regex("[A-Za-z_][A-Za-z0-9_]*", RegexOptions.Compiled);
    private static readonly HashSet<string> Keywords = BuildKeywords();
    private static readonly HashSet<string> DeclarationTypes = BuildDeclarationTypes();
    private static readonly HashSet<string> DataConfigurationSources = new HashSet<string>(StringComparer.Ordinal)
    {
        "defaultDataConfiguration",
        "classDataConfiguration"
    };
    private static readonly HashSet<string> ImplementationConfigurationSources = new HashSet<string>(StringComparer.Ordinal)
    {
        "defaultImplementationConfiguration",
        "classImplementationConfiguration"
    };

    public static MethodCodeConsistencyResult Validate(MethodCodeConsistencyRequest request)
    {
        if (request == null)
        {
            throw new AscetReadException("invalid_argument", "validate_method_consistency", "Method consistency request must not be null.");
        }

        string expectedCode = request.ExpectedCode ?? String.Empty;
        string actualCode = request.ActualCode ?? String.Empty;
        if (!String.Equals(expectedCode, actualCode, StringComparison.Ordinal))
        {
            throw new AscetReadException(
                "method_readback_mismatch",
                "validate_method_consistency",
                "Method code readback mismatch for '" + (request.MethodName ?? String.Empty) + "' in component '" + (request.ComponentPath ?? String.Empty) + "'.");
        }

        Dictionary<string, AscetElementSpec> elements = IndexElements(request.Elements);
        HashSet<string> knownNonElementSymbols = new HashSet<string>(StringComparer.Ordinal);
        AddNames(knownNonElementSymbols, request.MethodNames);
        AddNames(knownNonElementSymbols, request.SignatureNames);

        string scrubbed = ScrubCommentsAndStrings(actualCode);
        MatchCollection matches = IdentifierPattern.Matches(scrubbed);
        HashSet<string> localNames = CollectLocalNames(matches);
        MethodCodeConsistencyResult result = new MethodCodeConsistencyResult();
        HashSet<string> referenced = new HashSet<string>(StringComparer.Ordinal);
        HashSet<string> missing = new HashSet<string>(StringComparer.Ordinal);

        for (int i = 0; i < matches.Count; i++)
        {
            Match match = matches[i];
            string identifier = match.Value ?? String.Empty;
            if (String.IsNullOrWhiteSpace(identifier) || Keywords.Contains(identifier) || DeclarationTypes.Contains(identifier))
            {
                continue;
            }
            if (knownNonElementSymbols.Contains(identifier) || localNames.Contains(identifier))
            {
                continue;
            }
            if (IsMemberName(scrubbed, match.Index) || IsCallable(scrubbed, match.Index + match.Length))
            {
                continue;
            }

            AscetElementSpec element;
            if (elements.TryGetValue(identifier, out element))
            {
                if (referenced.Add(identifier))
                {
                    EnsureElementConfigurationsResolved(request, element);
                    result.ReferencedElements.Add(identifier);
                }
                continue;
            }

            if (LooksLikeElementIdentifier(identifier))
            {
                missing.Add(identifier);
            }
        }

        if (missing.Count > 0)
        {
            List<string> names = new List<string>(missing);
            names.Sort(StringComparer.Ordinal);
            throw new AscetReadException(
                "method_symbol_not_found",
                "validate_method_consistency",
                "Method '" + (request.MethodName ?? String.Empty) + "' in component '" + (request.ComponentPath ?? String.Empty) + "' references missing Element(s): " + String.Join(", ", names.ToArray()) + ".");
        }

        return result;
    }

    private static Dictionary<string, AscetElementSpec> IndexElements(IList<AscetElementSpec> elements)
    {
        Dictionary<string, AscetElementSpec> result = new Dictionary<string, AscetElementSpec>(StringComparer.Ordinal);
        if (elements == null)
        {
            return result;
        }
        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementSpec element = elements[i];
            if (element != null && !String.IsNullOrWhiteSpace(element.Name))
            {
                result[element.Name] = element;
            }
        }
        return result;
    }

    private static void AddNames(HashSet<string> target, IList<string> names)
    {
        if (target == null || names == null)
        {
            return;
        }
        for (int i = 0; i < names.Count; i++)
        {
            if (!String.IsNullOrWhiteSpace(names[i]))
            {
                target.Add(names[i]);
            }
        }
    }

    private static HashSet<string> CollectLocalNames(MatchCollection matches)
    {
        HashSet<string> result = new HashSet<string>(StringComparer.Ordinal);
        if (matches == null)
        {
            return result;
        }
        for (int i = 0; i + 1 < matches.Count; i++)
        {
            string current = matches[i].Value ?? String.Empty;
            if (DeclarationTypes.Contains(current))
            {
                result.Add(matches[i + 1].Value ?? String.Empty);
            }
        }
        return result;
    }

    private static void EnsureElementConfigurationsResolved(MethodCodeConsistencyRequest request, AscetElementSpec element)
    {
        if (element == null || element.Kind == AscetElementSpecKind.Component)
        {
            return;
        }

        AscetElementConfigurationProvenance provenance = element.ConfigurationProvenance;
        if (!IsAuthoritativeConfiguration(provenance == null ? null : provenance.DataConfiguration, DataConfigurationSources))
        {
            throw new AscetReadException(
                "method_element_data_configuration_unresolved",
                "validate_method_consistency",
                "Referenced Element '" + (element.Name ?? String.Empty) + "' does not resolve through a selected default/class DataConfiguration in method '" + (request.MethodName ?? String.Empty) + "'.");
        }
        if (!IsAuthoritativeConfiguration(provenance == null ? null : provenance.ImplementationConfiguration, ImplementationConfigurationSources))
        {
            throw new AscetReadException(
                "method_element_implementation_configuration_unresolved",
                "validate_method_consistency",
                "Referenced Element '" + (element.Name ?? String.Empty) + "' does not resolve through a selected default/class ImplConfiguration in method '" + (request.MethodName ?? String.Empty) + "'.");
        }
    }

    private static bool IsAuthoritativeConfiguration(AscetConfigurationProvenance provenance, HashSet<string> allowedSources)
    {
        return provenance != null &&
               provenance.Selected &&
               allowedSources != null &&
               allowedSources.Contains(provenance.Source ?? String.Empty) &&
               !String.IsNullOrWhiteSpace(provenance.ConfigurationName);
    }

    private static bool IsMemberName(string code, int identifierStart)
    {
        int index = identifierStart - 1;
        while (index >= 0 && Char.IsWhiteSpace(code[index]))
        {
            index--;
        }
        return index >= 0 && (code[index] == '.' || code[index] == ':');
    }

    private static bool IsCallable(string code, int identifierEnd)
    {
        int index = identifierEnd;
        while (index < code.Length && Char.IsWhiteSpace(code[index]))
        {
            index++;
        }
        return index < code.Length && code[index] == '(';
    }

    private static bool LooksLikeElementIdentifier(string identifier)
    {
        if (String.IsNullOrWhiteSpace(identifier) || identifier.IndexOf('_') < 0 || !Char.IsUpper(identifier[0]))
        {
            return false;
        }
        for (int i = 0; i < identifier.Length; i++)
        {
            if (Char.IsLower(identifier[i]))
            {
                return true;
            }
        }
        return false;
    }

    private static string ScrubCommentsAndStrings(string code)
    {
        if (String.IsNullOrEmpty(code))
        {
            return String.Empty;
        }

        StringBuilder result = new StringBuilder(code.Length);
        bool inLineComment = false;
        bool inBlockComment = false;
        bool inString = false;
        char quote = '\0';
        for (int i = 0; i < code.Length; i++)
        {
            char current = code[i];
            char next = i + 1 < code.Length ? code[i + 1] : '\0';
            if (inLineComment)
            {
                if (current == '\n' || current == '\r')
                {
                    inLineComment = false;
                    result.Append(current);
                }
                else
                {
                    result.Append(' ');
                }
                continue;
            }
            if (inBlockComment)
            {
                if (current == '*' && next == '/')
                {
                    result.Append("  ");
                    i++;
                    inBlockComment = false;
                }
                else
                {
                    result.Append(Char.IsWhiteSpace(current) ? current : ' ');
                }
                continue;
            }
            if (inString)
            {
                if (current == '\\' && next != '\0')
                {
                    result.Append("  ");
                    i++;
                    continue;
                }
                result.Append(Char.IsWhiteSpace(current) ? current : ' ');
                if (current == quote)
                {
                    inString = false;
                }
                continue;
            }
            if (current == '/' && next == '/')
            {
                result.Append("  ");
                i++;
                inLineComment = true;
                continue;
            }
            if (current == '/' && next == '*')
            {
                result.Append("  ");
                i++;
                inBlockComment = true;
                continue;
            }
            if (current == '\'' || current == '"')
            {
                result.Append(' ');
                inString = true;
                quote = current;
                continue;
            }
            result.Append(current);
        }
        return result.ToString();
    }

    private static HashSet<string> BuildKeywords()
    {
        return new HashSet<string>(StringComparer.Ordinal)
        {
            "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue", "return",
            "true", "false", "null", "this", "new", "const", "static", "public", "private", "protected", "import",
            "and", "or", "not", "in", "out", "inout"
        };
    }

    private static HashSet<string> BuildDeclarationTypes()
    {
        return new HashSet<string>(StringComparer.Ordinal)
        {
            "cont", "sdisc", "udisc", "log", "bool", "boolean", "byte", "short", "int", "long", "float", "double",
            "sint8", "sint16", "sint32", "sint64", "uint8", "uint16", "uint32", "uint64", "real32", "real64"
        };
    }
}
