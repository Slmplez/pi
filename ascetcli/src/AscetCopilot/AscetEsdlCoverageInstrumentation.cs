using System;
using System.Collections.Generic;
using System.Text;

public sealed class AscetEsdlCoverageInstrumentationResult
{
    public bool Succeeded { get; set; }
    public string OriginalCode { get; set; }
    public string SupportCode { get; set; }
    public string BodyCode { get; set; }
    public string InstrumentedCode { get; set; }
    public IList<string> Diagnostics { get; set; }
}

public interface IEsdlCoverageInstrumentationService
{
    AscetEsdlCoverageInstrumentationResult Instrument(string code, AscetEsdlCoverageModel model);
}

public sealed class EsdlCoverageInstrumentationService : IEsdlCoverageInstrumentationService
{
    private const int DecisionTraceSlotCapacity = 4;

    public AscetEsdlCoverageInstrumentationResult Instrument(string code, AscetEsdlCoverageModel model)
    {
        AscetEsdlCoverageInstrumentationResult result = CreateEmptyResult(code);
        if (model == null)
        {
            result.Diagnostics.Add("Coverage model is required.");
            return result;
        }

        if (!model.ParseSucceeded)
        {
            result.Diagnostics.Add("Coverage model did not parse successfully.");
            return result;
        }

        if (!ValidateRewriteTargets(code ?? String.Empty, model, result.Diagnostics))
        {
            return result;
        }

        string instrumented = code ?? String.Empty;
        instrumented = RewriteStatements(instrumented, model.Statements);
        instrumented = RewriteSwitches(instrumented, model.Switches);
        instrumented = RewriteDecisions(instrumented, model.Decisions, model.Conditions);

        StringBuilder builder = new StringBuilder();
        AppendResetHelper(builder, model);
        AppendStatementDeclarations(builder, model.Statements);
        AppendDecisionHelpers(builder, model.Decisions, model.Conditions);
        AppendSwitchDeclarations(builder, model.Switches);
        string supportCode = builder.ToString();

        result.Succeeded = true;
        result.SupportCode = supportCode;
        result.BodyCode = instrumented;
        result.InstrumentedCode = supportCode + instrumented + Environment.NewLine;
        return result;
    }

    private AscetEsdlCoverageInstrumentationResult CreateEmptyResult(string code)
    {
        return new AscetEsdlCoverageInstrumentationResult
        {
            Succeeded = false,
            OriginalCode = code ?? String.Empty,
            SupportCode = String.Empty,
            BodyCode = String.Empty,
            InstrumentedCode = String.Empty,
            Diagnostics = new List<string>()
        };
    }

    private string RewriteStatements(string code, IList<AscetCoverageStatementRef> statements)
    {
        string instrumented = code ?? String.Empty;
        if (statements == null)
        {
            return instrumented;
        }

        for (int i = 0; i < statements.Count; i++)
        {
            AscetCoverageStatementRef statement = statements[i];
            if (statement == null || String.IsNullOrWhiteSpace(statement.Text))
            {
                continue;
            }

            if (String.Equals(statement.Kind, "break", StringComparison.Ordinal))
            {
                instrumented = ReplaceFirst(
                    instrumented,
                    "break;",
                    "__cov_" + statement.Id + "_hits = __cov_" + statement.Id + "_hits + 1; break;");
                continue;
            }

            instrumented = ReplaceFirst(
                instrumented,
                statement.Text,
                "__cov_" + statement.Id + "_hits = __cov_" + statement.Id + "_hits + 1; " + statement.Text);
        }

        return instrumented;
    }

    private string RewriteDecisions(string code, IList<AscetCoverageDecisionRef> decisions, IList<AscetCoverageConditionRef> conditions)
    {
        string instrumented = code ?? String.Empty;
        if (decisions == null)
        {
            return instrumented;
        }

        for (int i = 0; i < decisions.Count; i++)
        {
            AscetCoverageDecisionRef decision = decisions[i];
            if (decision == null || String.IsNullOrWhiteSpace(decision.ConditionText))
            {
                continue;
            }

            string wrappedCondition = BuildWrappedCondition(decision, conditions);
            if (String.IsNullOrWhiteSpace(wrappedCondition))
            {
                continue;
            }

            instrumented = ReplaceFirst(
                instrumented,
                decision.ConditionText,
                "__cov_" + decision.Id + "_record_expr(" + wrappedCondition + ")");
        }

        return instrumented;
    }

    private string RewriteSwitches(string code, IList<AscetCoverageSwitchRef> switches)
    {
        string instrumented = code ?? String.Empty;
        if (switches == null)
        {
            return instrumented;
        }

        for (int i = 0; i < switches.Count; i++)
        {
            AscetCoverageSwitchRef switchRef = switches[i];
            if (switchRef == null || switchRef.Labels == null)
            {
                continue;
            }

            for (int j = 0; j < switchRef.Labels.Count; j++)
            {
                AscetCoverageSwitchLabelRef label = switchRef.Labels[j];
                if (label == null)
                {
                    continue;
                }

                string sourceLabel = label.IsDefault ? "default:" : "case " + label.LabelText + ":";
                string instrumentedLabel = sourceLabel + " if (__cov_" + switchRef.Id + "_match == 0) { __cov_" + switchRef.Id + "_match = 1; __cov_" + label.Id.Replace(".", "_") + "_hits = __cov_" + label.Id.Replace(".", "_") + "_hits + 1; }";
                instrumented = ReplaceFirst(instrumented, sourceLabel, instrumentedLabel);
            }
        }

        return instrumented;
    }

    private string BuildWrappedCondition(AscetCoverageDecisionRef decision, IList<AscetCoverageConditionRef> conditions)
    {
        if (decision == null || String.IsNullOrWhiteSpace(decision.ConditionText))
        {
            return String.Empty;
        }

        string wrapped = decision.ConditionText;
        if (decision.ConditionIDs == null || decision.ConditionIDs.Count == 0)
        {
            return wrapped;
        }

        for (int i = 0; i < decision.ConditionIDs.Count; i++)
        {
            string conditionID = decision.ConditionIDs[i];
            AscetCoverageConditionRef condition = FindCondition(conditions, conditionID);
            if (condition == null || String.IsNullOrWhiteSpace(condition.Text))
            {
                continue;
            }

            wrapped = ReplaceFirst(wrapped, condition.Text, "__cov_" + condition.Id.Replace(".", "_") + "(" + condition.Text + ")");
        }

        return wrapped;
    }

    private AscetCoverageConditionRef FindCondition(IList<AscetCoverageConditionRef> conditions, string conditionID)
    {
        if (conditions == null || String.IsNullOrWhiteSpace(conditionID))
        {
            return null;
        }

        for (int i = 0; i < conditions.Count; i++)
        {
            AscetCoverageConditionRef condition = conditions[i];
            if (condition != null && String.Equals(condition.Id, conditionID, StringComparison.Ordinal))
            {
                return condition;
            }
        }

        return null;
    }

    private void AppendResetHelper(StringBuilder builder, AscetEsdlCoverageModel model)
    {
        builder.AppendLine("void __cov_reset() {");
        AppendResetStatements(builder, model == null ? null : model.Statements);
        AppendResetDecisions(builder, model == null ? null : model.Decisions);
        AppendResetSwitches(builder, model == null ? null : model.Switches);
        builder.AppendLine("}");
        builder.AppendLine();
    }

    private void AppendStatementDeclarations(StringBuilder builder, IList<AscetCoverageStatementRef> statements)
    {
        if (statements == null)
        {
            return;
        }

        for (int i = 0; i < statements.Count; i++)
        {
            AscetCoverageStatementRef statement = statements[i];
            if (statement != null)
            {
                builder.Append("int __cov_").Append(statement.Id).AppendLine("_hits;");
            }
        }

        if (statements.Count > 0)
        {
            builder.AppendLine();
        }
    }

    private void AppendDecisionHelpers(StringBuilder builder, IList<AscetCoverageDecisionRef> decisions, IList<AscetCoverageConditionRef> conditions)
    {
        if (decisions == null)
        {
            return;
        }

        for (int i = 0; i < decisions.Count; i++)
        {
            AscetCoverageDecisionRef decision = decisions[i];
            if (decision == null)
            {
                continue;
            }

            builder.Append("int __cov_").Append(decision.Id).AppendLine("_true_hits;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_false_hits;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_tmp_evalmask;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_tmp_valuemask;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_slot_count;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_last_evalmask;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_last_valuemask;");
            builder.Append("boolean __cov_").Append(decision.Id).AppendLine("_last_result;");
            builder.Append("int __cov_").Append(decision.Id).AppendLine("_overflow;");
            for (int slot = 1; slot <= DecisionTraceSlotCapacity; slot++)
            {
                string slotName = slot.ToString("000");
                builder.Append("int __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_evalmask;");
                builder.Append("int __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_valuemask;");
                builder.Append("boolean __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_result;");
            }

            if (decision.ConditionIDs != null)
            {
                for (int j = 0; j < decision.ConditionIDs.Count; j++)
                {
                    AscetCoverageConditionRef condition = FindCondition(conditions, decision.ConditionIDs[j]);
                    if (condition == null)
                    {
                        continue;
                    }

                    string helperName = "__cov_" + condition.Id.Replace(".", "_");
                    int bitValue = 1 << j;
                    builder.Append("boolean ").Append(helperName).AppendLine("(boolean value) {");
                    builder.Append("    __cov_").Append(decision.Id).Append("_tmp_evalmask = __cov_").Append(decision.Id).Append("_tmp_evalmask | ").Append(bitValue).AppendLine(";");
                    builder.Append("    if (value) { __cov_").Append(decision.Id).Append("_tmp_valuemask = __cov_").Append(decision.Id).Append("_tmp_valuemask | ").Append(bitValue).AppendLine("; }");
                    builder.AppendLine("    return value;");
                    builder.AppendLine("}");
                }
            }

            builder.Append("boolean __cov_").Append(decision.Id).AppendLine("_record_expr(boolean value) {");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_record(value);");
            builder.AppendLine("    return value;");
            builder.AppendLine("}");

            builder.Append("void __cov_").Append(decision.Id).AppendLine("_record(boolean value) {");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_slot_count = __cov_" + decision.Id + "_slot_count + 1;");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_evalmask = __cov_" + decision.Id + "_tmp_evalmask;");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_valuemask = __cov_" + decision.Id + "_tmp_valuemask;");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_result = value;");
            for (int slot = 1; slot <= DecisionTraceSlotCapacity; slot++)
            {
                string slotName = slot.ToString("000");
                string prefix = slot == 1 ? "    if" : "    else if";
                builder.Append(prefix).Append(" (__cov_").Append(decision.Id).Append("_slot_count == ").Append(slot).AppendLine(") {");
                builder.Append("        __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_evalmask = __cov_" + decision.Id + "_tmp_evalmask;");
                builder.Append("        __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_valuemask = __cov_" + decision.Id + "_tmp_valuemask;");
                builder.Append("        __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_result = value;");
                builder.AppendLine("    }");
            }
            builder.Append("    else { __cov_").Append(decision.Id).AppendLine("_overflow = __cov_" + decision.Id + "_overflow + 1; }");
            builder.Append("    if (value) { __cov_").Append(decision.Id).AppendLine("_true_hits = __cov_" + decision.Id + "_true_hits + 1; }");
            builder.Append("    else { __cov_").Append(decision.Id).AppendLine("_false_hits = __cov_" + decision.Id + "_false_hits + 1; }");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_tmp_evalmask = 0;");
            builder.Append("    __cov_").Append(decision.Id).AppendLine("_tmp_valuemask = 0;");
            builder.AppendLine("}");
            builder.AppendLine();
        }
    }

    private void AppendSwitchDeclarations(StringBuilder builder, IList<AscetCoverageSwitchRef> switches)
    {
        if (switches == null)
        {
            return;
        }

        for (int i = 0; i < switches.Count; i++)
        {
            AscetCoverageSwitchRef switchRef = switches[i];
            if (switchRef == null)
            {
                continue;
            }

            builder.Append("int __cov_").Append(switchRef.Id).AppendLine("_match;");
            if (switchRef.Labels != null)
            {
                for (int j = 0; j < switchRef.Labels.Count; j++)
                {
                    AscetCoverageSwitchLabelRef label = switchRef.Labels[j];
                    if (label != null)
                    {
                        builder.Append("int __cov_").Append(label.Id.Replace(".", "_")).AppendLine("_hits;");
                    }
                }
            }
            builder.AppendLine();
        }
    }

    private void AppendResetStatements(StringBuilder builder, IList<AscetCoverageStatementRef> statements)
    {
        if (statements == null)
        {
            return;
        }

        for (int i = 0; i < statements.Count; i++)
        {
            AscetCoverageStatementRef statement = statements[i];
            if (statement != null)
            {
                builder.Append("    __cov_").Append(statement.Id).AppendLine("_hits = 0;");
            }
        }
    }

    private void AppendResetDecisions(StringBuilder builder, IList<AscetCoverageDecisionRef> decisions)
    {
        if (decisions == null)
        {
            return;
        }

        for (int i = 0; i < decisions.Count; i++)
        {
            AscetCoverageDecisionRef decision = decisions[i];
            if (decision != null)
            {
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_true_hits = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_false_hits = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_tmp_evalmask = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_tmp_valuemask = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_slot_count = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_evalmask = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_valuemask = 0;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_last_result = false;");
                builder.Append("    __cov_").Append(decision.Id).AppendLine("_overflow = 0;");
                for (int slot = 1; slot <= DecisionTraceSlotCapacity; slot++)
                {
                    string slotName = slot.ToString("000");
                    builder.Append("    __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_evalmask = 0;");
                    builder.Append("    __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_valuemask = 0;");
                    builder.Append("    __cov_").Append(decision.Id).Append("_slot_").Append(slotName).AppendLine("_result = false;");
                }
            }
        }
    }

    private void AppendResetSwitches(StringBuilder builder, IList<AscetCoverageSwitchRef> switches)
    {
        if (switches == null)
        {
            return;
        }

        for (int i = 0; i < switches.Count; i++)
        {
            AscetCoverageSwitchRef switchRef = switches[i];
            if (switchRef == null)
            {
                continue;
            }

            builder.Append("    __cov_").Append(switchRef.Id).AppendLine("_match = 0;");
            if (switchRef.Labels == null)
            {
                continue;
            }

            for (int j = 0; j < switchRef.Labels.Count; j++)
            {
                AscetCoverageSwitchLabelRef label = switchRef.Labels[j];
                if (label != null)
                {
                    builder.Append("    __cov_").Append(label.Id.Replace(".", "_")).AppendLine("_hits = 0;");
                }
            }
        }
    }

    private string ReplaceFirst(string text, string oldValue, string newValue)
    {
        if (String.IsNullOrEmpty(text) || String.IsNullOrEmpty(oldValue))
        {
            return text ?? String.Empty;
        }

        int index = text.IndexOf(oldValue, StringComparison.Ordinal);
        if (index < 0)
        {
            return text;
        }

        return text.Substring(0, index) + newValue + text.Substring(index + oldValue.Length);
    }

    private bool ValidateRewriteTargets(string source, AscetEsdlCoverageModel model, IList<string> diagnostics)
    {
        if (model == null)
        {
            return false;
        }

        if (!ValidateUniqueStatementTargets(source, model.Statements, diagnostics))
        {
            return false;
        }

        if (!ValidateUniqueDecisionTargets(source, model.Decisions, diagnostics))
        {
            return false;
        }

        if (!ValidateUniqueAtomicConditionTargets(model.Decisions, model.Conditions, diagnostics))
        {
            return false;
        }

        if (!ValidateUniqueSwitchTargets(source, model.Switches, diagnostics))
        {
            return false;
        }

        return true;
    }

    private bool ValidateUniqueAtomicConditionTargets(IList<AscetCoverageDecisionRef> decisions, IList<AscetCoverageConditionRef> conditions, IList<string> diagnostics)
    {
        if (decisions == null)
        {
            return true;
        }

        for (int i = 0; i < decisions.Count; i++)
        {
            AscetCoverageDecisionRef decision = decisions[i];
            if (decision == null || decision.ConditionIDs == null)
            {
                continue;
            }

            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            for (int j = 0; j < decision.ConditionIDs.Count; j++)
            {
                AscetCoverageConditionRef condition = FindCondition(conditions, decision.ConditionIDs[j]);
                if (condition == null || String.IsNullOrWhiteSpace(condition.Text))
                {
                    continue;
                }

                if (!seen.Add(condition.Text))
                {
                    diagnostics.Add("Ambiguous atomic condition rewrite target in " + (decision.Id ?? String.Empty) + ": " + condition.Text);
                    return false;
                }
            }
        }

        return true;
    }

    private bool ValidateUniqueStatementTargets(string source, IList<AscetCoverageStatementRef> statements, IList<string> diagnostics)
    {
        if (statements == null)
        {
            return true;
        }

        for (int i = 0; i < statements.Count; i++)
        {
            AscetCoverageStatementRef statement = statements[i];
            if (statement == null || String.IsNullOrWhiteSpace(statement.Text))
            {
                continue;
            }

            if (CountOccurrences(source, statement.Text) > 1)
            {
                diagnostics.Add("Ambiguous rewrite target: " + statement.Text);
                return false;
            }
        }

        return true;
    }

    private bool ValidateUniqueDecisionTargets(string source, IList<AscetCoverageDecisionRef> decisions, IList<string> diagnostics)
    {
        if (decisions == null)
        {
            return true;
        }

        for (int i = 0; i < decisions.Count; i++)
        {
            AscetCoverageDecisionRef decision = decisions[i];
            if (decision == null || String.IsNullOrWhiteSpace(decision.ConditionText))
            {
                continue;
            }

            if (CountOccurrences(source, decision.ConditionText) > 1)
            {
                diagnostics.Add("Ambiguous decision rewrite target: " + decision.ConditionText);
                return false;
            }
        }

        return true;
    }

    private bool ValidateUniqueSwitchTargets(string source, IList<AscetCoverageSwitchRef> switches, IList<string> diagnostics)
    {
        if (switches == null)
        {
            return true;
        }

        for (int i = 0; i < switches.Count; i++)
        {
            AscetCoverageSwitchRef switchRef = switches[i];
            if (switchRef == null || switchRef.Labels == null)
            {
                continue;
            }

            for (int j = 0; j < switchRef.Labels.Count; j++)
            {
                AscetCoverageSwitchLabelRef label = switchRef.Labels[j];
                if (label == null)
                {
                    continue;
                }

                string sourceLabel = label.IsDefault ? "default:" : "case " + label.LabelText + ":";
                if (CountOccurrences(source, sourceLabel) > 1)
                {
                    diagnostics.Add("Ambiguous switch rewrite target: " + sourceLabel);
                    return false;
                }
            }
        }

        return true;
    }

    private int CountOccurrences(string source, string value)
    {
        if (String.IsNullOrEmpty(source) || String.IsNullOrEmpty(value))
        {
            return 0;
        }

        int count = 0;
        int index = 0;
        while (true)
        {
            index = source.IndexOf(value, index, StringComparison.Ordinal);
            if (index < 0)
            {
                return count;
            }

            count++;
            index += value.Length;
        }
    }
}

public static class AscetEsdlCoverageInstrumentationFormatter
{
    public static string FormatTextOutput(AscetEsdlCoverageInstrumentationResult result)
    {
        if (result == null)
        {
            return String.Empty;
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Succeeded: ").Append(result.Succeeded).AppendLine();
        builder.AppendLine("SupportCode:");
        builder.Append(result.SupportCode ?? String.Empty);
        if (!String.IsNullOrEmpty(result.SupportCode) && !result.SupportCode.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }
        builder.AppendLine("BodyCode:");
        builder.Append(result.BodyCode ?? String.Empty);
        if (!String.IsNullOrEmpty(result.BodyCode) && !result.BodyCode.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }
        builder.AppendLine("InstrumentedCode:");
        builder.Append(result.InstrumentedCode ?? String.Empty);
        if (!String.IsNullOrEmpty(result.InstrumentedCode) && !result.InstrumentedCode.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }

        if (result.Diagnostics != null && result.Diagnostics.Count > 0)
        {
            builder.AppendLine("Diagnostics:");
            for (int i = 0; i < result.Diagnostics.Count; i++)
            {
                builder.Append("- ").Append(result.Diagnostics[i] ?? String.Empty).AppendLine();
            }
        }

        return builder.ToString();
    }
}
