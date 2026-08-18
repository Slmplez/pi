using System;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Ascet;

public enum AscetTextCodeWriteKind
{
    Header = 1,
    ExternalCCode = 2
}

public sealed class AscetTextCodeWriteResult
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public AscetTextCodeWriteKind WriteKind { get; set; }
    public int PreviousCodeLength { get; set; }
    public int NewCodeLength { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public bool SaveSucceeded { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public string VerificationMode { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int EditableRetryCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
}

public sealed class AscetStateSelector
{
    public string Name { get; set; }
}

public sealed class AscetTransitionSelector
{
    public string Name { get; set; }
    public string SourceName { get; set; }
    public string TargetName { get; set; }
    public int? Priority { get; set; }
}

public sealed class AscetStateMachineWriteResult
{
    public string ComponentPath { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string Operation { get; set; }
    public string TargetName { get; set; }
    public string PreviousValue { get; set; }
    public string NewValue { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public bool SaveSucceeded { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public string VerificationMode { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int EditableRetryCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
}

public sealed class AscetComponentWriteCapabilities
{
    public bool SupportsMethodCode { get; set; }
    public bool SupportsHeaderCode { get; set; }
    public bool SupportsExternalCCode { get; set; }
    public bool SupportsStateActionEsdl { get; set; }
    public bool SupportsTransitionConditionEsdl { get; set; }
    public bool SupportsTransitionActionEsdl { get; set; }
    public bool SupportsStateMethodBinding { get; set; }
    public bool SupportsTransitionMethodBinding { get; set; }
    public bool SupportsSetStartState { get; set; }
}

public interface ITextCodeWriteService
{
    AscetTextCodeWriteResult SetHeader(AscetItemRef component, string code, bool verifyReadback);
    AscetTextCodeWriteResult SetExternalCCode(AscetItemRef component, string code, bool verifyReadback);
}

public interface IModuleWriteService
{
    AscetMethodWriteResult SetMethodCode(AscetItemRef module, string methodName, string code, bool verifyReadback);
    AscetTextCodeWriteResult SetHeader(AscetItemRef module, string code, bool verifyReadback);
    AscetTextCodeWriteResult SetExternalCCode(AscetItemRef module, string code, bool verifyReadback);
}

public interface IStateMachineWriteService
{
    AscetMethodWriteResult SetMethodCode(AscetItemRef stateMachine, string methodName, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateEntryActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateExitActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateStaticActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult BindStateEntryActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindStateExitActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindStateStaticActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult SetTransitionConditionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetTransitionActionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult BindTransitionConditionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindTransitionActionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult SetStartState(AscetItemRef stateMachine, AscetStateSelector selector, bool verifyReadback);
}

public interface IComponentWriteRouter
{
    AscetComponentWriteCapabilities GetCapabilities(AscetItemRef component);
    AscetMethodWriteResult SetMethodCode(AscetItemRef component, string methodName, string code, bool verifyReadback);
    AscetTextCodeWriteResult SetHeader(AscetItemRef component, string code, bool verifyReadback);
    AscetTextCodeWriteResult SetExternalCCode(AscetItemRef component, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateEntryActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateExitActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetStateStaticActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult BindStateEntryActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindStateExitActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindStateStaticActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult SetTransitionConditionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult SetTransitionActionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback);
    AscetStateMachineWriteResult BindTransitionConditionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult BindTransitionActionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback);
    AscetStateMachineWriteResult SetStartState(AscetItemRef stateMachine, AscetStateSelector selector, bool verifyReadback);
}

public static class AscetComponentWriteUtilities
{
    public static AscetComponentWriteCapabilities GetCapabilities(AscetItemRef component)
    {
        AscetComponentKind kind = component == null ? AscetComponentKind.Unknown : component.Kind;
        AscetLanguageKind language = component == null ? AscetLanguageKind.Unknown : component.LanguageKind;
        if (kind == AscetComponentKind.Class || kind == AscetComponentKind.Module)
        {
            return new AscetComponentWriteCapabilities
            {
                SupportsMethodCode = language == AscetLanguageKind.ESDL || language == AscetLanguageKind.C,
                SupportsHeaderCode = language == AscetLanguageKind.C,
                SupportsExternalCCode = language == AscetLanguageKind.C
            };
        }

        if (kind == AscetComponentKind.StateMachine)
        {
            return new AscetComponentWriteCapabilities
            {
                SupportsMethodCode = language == AscetLanguageKind.ESDL,
                SupportsStateActionEsdl = language == AscetLanguageKind.ESDL,
                SupportsTransitionConditionEsdl = language == AscetLanguageKind.ESDL,
                SupportsTransitionActionEsdl = language == AscetLanguageKind.ESDL,
                SupportsStateMethodBinding = true,
                SupportsTransitionMethodBinding = true,
                SupportsSetStartState = true
            };
        }

        return new AscetComponentWriteCapabilities();
    }

    public static void RequireComponentKind(AscetItemRef component, AscetComponentKind expectedKind, string operation)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Component reference must not be null.");
        }

        if (component.Kind != expectedKind)
        {
            throw new AscetReadException("unsupported_component_kind", operation, "Item '" + component.Path + "' is not a " + expectedKind.ToString() + ".");
        }
    }

    public static void RequireTextBasedComponent(AscetItemRef component, string operation)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Component reference must not be null.");
        }

        if (component.LanguageKind != AscetLanguageKind.ESDL && component.LanguageKind != AscetLanguageKind.C)
        {
            throw new AscetReadException("text_code_not_supported", operation, "Operation '" + operation + "' requires a text-based C/ESDL component. Component '" + component.Path + "' is '" + component.LanguageKind.ToString() + "'.");
        }
    }

    public static void RequireCLanguage(AscetItemRef component, string operation)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Component reference must not be null.");
        }

        if (component.LanguageKind != AscetLanguageKind.C)
        {
            throw new AscetReadException("text_code_not_supported", operation, "Operation '" + operation + "' requires a C component. Component '" + component.Path + "' is '" + component.LanguageKind.ToString() + "'.");
        }
    }

    public static void RequireStateMachineEsdl(AscetItemRef component, string operation)
    {
        RequireComponentKind(component, AscetComponentKind.StateMachine, operation);
        if (component.LanguageKind != AscetLanguageKind.ESDL)
        {
            throw new AscetReadException("state_machine_esdl_not_supported", operation, "Operation '" + operation + "' requires an ESDL state machine. Component '" + component.Path + "' is '" + component.LanguageKind.ToString() + "'.");
        }
    }

    public static string DescribeTransitionSelector(AscetTransitionSelector selector)
    {
        if (selector == null)
        {
            return String.Empty;
        }

        string source = selector.SourceName ?? String.Empty;
        string target = selector.TargetName ?? String.Empty;
        string result = source + "->" + target;
        if (!String.IsNullOrWhiteSpace(selector.Name))
        {
            result = selector.Name + (String.IsNullOrWhiteSpace(result) ? String.Empty : (" [" + result + "]"));
        }
        if (selector.Priority.HasValue)
        {
            result += "#" + selector.Priority.Value.ToString();
        }
        return result;
    }
}

public sealed class TextCodeWriteService : AscetReadDomainServiceBase, ITextCodeWriteService
{
    public AscetTextCodeWriteResult SetHeader(AscetItemRef component, string code, bool verifyReadback)
    {
        return WriteTextCode("set_header", component, code, verifyReadback, AscetTextCodeWriteKind.Header, delegate(FunctionalComponent fc) { return fc.GetHeader(); }, delegate(FunctionalComponent fc, string value) { return fc.SetHeader(value); });
    }

    public AscetTextCodeWriteResult SetExternalCCode(AscetItemRef component, string code, bool verifyReadback)
    {
        return WriteTextCode("set_external_c_code", component, code, verifyReadback, AscetTextCodeWriteKind.ExternalCCode, delegate(FunctionalComponent fc) { return fc.GetExternalCCode(); }, delegate(FunctionalComponent fc, string value) { return fc.SetExternalCCode(value); });
    }

    private AscetTextCodeWriteResult WriteTextCode(string operation, AscetItemRef component, string code, bool verifyReadback, AscetTextCodeWriteKind writeKind, Func<FunctionalComponent, string> getter, Func<FunctionalComponent, string, bool> setter)
    {
        AscetComponentWriteUtilities.RequireCLanguage(component, operation);
        if (code == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Code must not be null.");
        }

        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            FunctionalComponent functionalComponent = ResolveFunctionalComponent(session, component);
            string previousCode = getter(functionalComponent) ?? String.Empty;
            RequireComponentEditableInSession(session, component.Path, operation);
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                operation,
                previousCode,
                code,
                verifyReadback,
                delegate { return setter(functionalComponent, code); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate { return getter(functionalComponent) ?? String.Empty; });

            return new AscetTextCodeWriteResult
            {
                ComponentPath = component.Path,
                ComponentKind = component.Kind,
                LanguageKind = component.LanguageKind,
                WriteKind = writeKind,
                PreviousCodeLength = previousCode.Length,
                NewCodeLength = code.Length,
                WriteSucceeded = true,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = transaction.Verified,
                Changed = transaction.Changed,
                MutationStatus = transaction.MutationStatus,
                SaveAttempted = transaction.SaveAttempted,
                SaveSucceeded = transaction.SaveSucceeded,
                SaveState = transaction.SaveState,
                Verified = transaction.Verified,
                VerificationStatus = transaction.VerificationStatus,
                VerificationMode = transaction.VerificationMode,
                SessionCount = transaction.SessionCount,
                SaveCount = transaction.SaveCount,
                EditableRetryCount = transaction.EditableRetryCount,
                NativeMutationAttemptCount = transaction.NativeMutationAttemptCount
            };
        });
    }
}

public sealed class ModuleWriteService : IModuleWriteService
{
    private readonly IMethodWriteService methodWriteService;
    private readonly ITextCodeWriteService textCodeWriteService;

    public ModuleWriteService() : this(new MethodWriteService(), new TextCodeWriteService()) { }

    public ModuleWriteService(IMethodWriteService methodWriteService, ITextCodeWriteService textCodeWriteService)
    {
        this.methodWriteService = methodWriteService;
        this.textCodeWriteService = textCodeWriteService;
    }

    public AscetMethodWriteResult SetMethodCode(AscetItemRef module, string methodName, string code, bool verifyReadback)
    {
        AscetComponentWriteUtilities.RequireComponentKind(module, AscetComponentKind.Module, "set_module_method_code");
        AscetComponentWriteUtilities.RequireTextBasedComponent(module, "set_module_method_code");
        return methodWriteService.SetMethodCode(module, methodName, code, verifyReadback);
    }

    public AscetTextCodeWriteResult SetHeader(AscetItemRef module, string code, bool verifyReadback)
    {
        AscetComponentWriteUtilities.RequireComponentKind(module, AscetComponentKind.Module, "set_module_header");
        return textCodeWriteService.SetHeader(module, code, verifyReadback);
    }

    public AscetTextCodeWriteResult SetExternalCCode(AscetItemRef module, string code, bool verifyReadback)
    {
        AscetComponentWriteUtilities.RequireComponentKind(module, AscetComponentKind.Module, "set_module_external_c_code");
        return textCodeWriteService.SetExternalCCode(module, code, verifyReadback);
    }
}
public sealed class StateMachineWriteService : MethodCatalogService, IStateMachineWriteService
{
    private readonly IMethodWriteService methodWriteService;

    public StateMachineWriteService() : this(new MethodWriteService()) { }

    public StateMachineWriteService(IMethodWriteService methodWriteService)
    {
        this.methodWriteService = methodWriteService;
    }

    public AscetMethodWriteResult SetMethodCode(AscetItemRef stateMachine, string methodName, string code, bool verifyReadback)
    {
        AscetComponentWriteUtilities.RequireComponentKind(stateMachine, AscetComponentKind.StateMachine, "set_state_machine_method_code");
        AscetComponentWriteUtilities.RequireTextBasedComponent(stateMachine, "set_state_machine_method_code");
        return methodWriteService.SetMethodCode(stateMachine, methodName, code, verifyReadback);
    }

    public AscetStateMachineWriteResult SetStateEntryActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback)
    {
        return WriteStateEsdl("set_state_entry_action_esdl", stateMachine, selector, code, verifyReadback, delegate(State state) { return state.GetEntryActionESDL(); }, delegate(State state, string value) { return state.SetEntryActionESDL(value); });
    }

    public AscetStateMachineWriteResult SetStateExitActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback)
    {
        return WriteStateEsdl("set_state_exit_action_esdl", stateMachine, selector, code, verifyReadback, delegate(State state) { return state.GetExitActionESDL(); }, delegate(State state, string value) { return state.SetExitActionESDL(value); });
    }

    public AscetStateMachineWriteResult SetStateStaticActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback)
    {
        return WriteStateEsdl("set_state_static_action_esdl", stateMachine, selector, code, verifyReadback, delegate(State state) { return state.GetStaticActionESDL(); }, delegate(State state, string value) { return state.SetStaticActionESDL(value); });
    }

    public AscetStateMachineWriteResult BindStateEntryActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback)
    {
        return BindStateMethod("bind_state_entry_action_method", stateMachine, selector, methodName, verifyReadback, delegate(State state) { return state.GetEntryAction() as AbstractMethod; }, delegate(State state, AbstractMethod method) { return state.SetEntryAction(method); });
    }

    public AscetStateMachineWriteResult BindStateExitActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback)
    {
        return BindStateMethod("bind_state_exit_action_method", stateMachine, selector, methodName, verifyReadback, delegate(State state) { return state.GetExitAction() as AbstractMethod; }, delegate(State state, AbstractMethod method) { return state.SetExitAction(method); });
    }

    public AscetStateMachineWriteResult BindStateStaticActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback)
    {
        return BindStateMethod("bind_state_static_action_method", stateMachine, selector, methodName, verifyReadback, delegate(State state) { return state.GetStaticAction() as AbstractMethod; }, delegate(State state, AbstractMethod method) { return state.SetStaticAction(method); });
    }

    public AscetStateMachineWriteResult SetTransitionConditionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback)
    {
        return WriteTransitionEsdl("set_transition_condition_esdl", stateMachine, selector, code, verifyReadback, delegate(Transition transition) { return transition.GetConditionESDL(); }, delegate(Transition transition, string value) { return transition.SetConditionESDL(value); });
    }

    public AscetStateMachineWriteResult SetTransitionActionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback)
    {
        return WriteTransitionEsdl("set_transition_action_esdl", stateMachine, selector, code, verifyReadback, delegate(Transition transition) { return transition.GetActionESDL(); }, delegate(Transition transition, string value) { return transition.SetActionESDL(value); });
    }

    public AscetStateMachineWriteResult BindTransitionConditionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback)
    {
        return BindTransitionMethod("bind_transition_condition_method", stateMachine, selector, methodName, verifyReadback, delegate(Transition transition) { return transition.GetCondition() as AbstractMethod; }, delegate(Transition transition, AbstractMethod method) { return transition.SetCondition(method); });
    }

    public AscetStateMachineWriteResult BindTransitionActionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback)
    {
        return BindTransitionMethod("bind_transition_action_method", stateMachine, selector, methodName, verifyReadback, delegate(Transition transition) { return transition.GetAction() as AbstractMethod; }, delegate(Transition transition, AbstractMethod method) { return transition.SetAction(method); });
    }

    public AscetStateMachineWriteResult SetStartState(AscetItemRef stateMachine, AscetStateSelector selector, bool verifyReadback)
    {
        AscetComponentWriteUtilities.RequireComponentKind(stateMachine, AscetComponentKind.StateMachine, "set_start_state");
        return ExecuteWithSession("set_start_state", delegate(AscetSession session)
        {
            State state = ResolveState(session, stateMachine, selector, "set_start_state");
            string targetName = state.GetName() ?? String.Empty;
            string previousValue = state.IsStartState() ? "true" : "false";
            RequireComponentEditableInSession(session, stateMachine.Path, "set_start_state");
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                "set_start_state",
                previousValue,
                "true",
                verifyReadback,
                delegate { return state.SetStartState(); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate { return state.IsStartState() ? "true" : "false"; });
            return BuildWriteResult(stateMachine, "SetStartState", targetName, transaction, verifyReadback);
        });
    }
    private AscetStateMachineWriteResult WriteStateEsdl(string operation, AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback, Func<State, string> getter, Func<State, string, bool> setter)
    {
        AscetComponentWriteUtilities.RequireStateMachineEsdl(stateMachine, operation);
        if (code == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Code must not be null.");
        }

        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            State state = ResolveState(session, stateMachine, selector, operation);
            string targetName = state.GetName() ?? String.Empty;
            string previousValue = getter(state) ?? String.Empty;
            RequireComponentEditableInSession(session, stateMachine.Path, operation);
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                operation,
                previousValue,
                code,
                verifyReadback,
                delegate { return setter(state, code); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate { return getter(state) ?? String.Empty; });
            return BuildWriteResult(stateMachine, operation, targetName, transaction, verifyReadback);
        });
    }
    private AscetStateMachineWriteResult BindStateMethod(string operation, AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback, Func<State, AbstractMethod> getter, Func<State, AbstractMethod, bool> setter)
    {
        AscetComponentWriteUtilities.RequireComponentKind(stateMachine, AscetComponentKind.StateMachine, operation);
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", operation, "Method name must not be empty.");
        }

        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            State state = ResolveState(session, stateMachine, selector, operation);
            MethodHandle method = FindMethodHandle(CollectMethodHandles(session, stateMachine), stateMachine.Path, methodName);
            string targetName = state.GetName() ?? String.Empty;
            AbstractMethod previousMethod = getter(state);
            string previousValue = previousMethod == null ? String.Empty : (previousMethod.GetName() ?? String.Empty);
            RequireComponentEditableInSession(session, stateMachine.Path, operation);
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                operation,
                previousValue,
                methodName,
                verifyReadback,
                delegate { return setter(state, method.Method); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate
                {
                    AbstractMethod readbackMethod = getter(state);
                    return readbackMethod == null ? String.Empty : (readbackMethod.GetName() ?? String.Empty);
                });
            return BuildWriteResult(stateMachine, operation, targetName, transaction, verifyReadback);
        });
    }
    private AscetStateMachineWriteResult WriteTransitionEsdl(string operation, AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback, Func<Transition, string> getter, Func<Transition, string, bool> setter)
    {
        AscetComponentWriteUtilities.RequireStateMachineEsdl(stateMachine, operation);
        if (code == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Code must not be null.");
        }

        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            Transition transition = ResolveTransition(session, stateMachine, selector, operation);
            AscetTransitionRef transitionRef = BuildTransitionRef(transition);
            string targetName = transitionRef == null ? AscetComponentWriteUtilities.DescribeTransitionSelector(selector) : (transitionRef.SourceName + "->" + transitionRef.TargetName);
            string previousValue = getter(transition) ?? String.Empty;
            RequireComponentEditableInSession(session, stateMachine.Path, operation);
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                operation,
                previousValue,
                code,
                verifyReadback,
                delegate { return setter(transition, code); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate { return getter(transition) ?? String.Empty; });
            return BuildWriteResult(stateMachine, operation, targetName, transaction, verifyReadback);
        });
    }
    private AscetStateMachineWriteResult BindTransitionMethod(string operation, AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback, Func<Transition, AbstractMethod> getter, Func<Transition, AbstractMethod, bool> setter)
    {
        AscetComponentWriteUtilities.RequireComponentKind(stateMachine, AscetComponentKind.StateMachine, operation);
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", operation, "Method name must not be empty.");
        }

        return ExecuteWithSession(operation, delegate(AscetSession session)
        {
            Transition transition = ResolveTransition(session, stateMachine, selector, operation);
            MethodHandle method = FindMethodHandle(CollectMethodHandles(session, stateMachine), stateMachine.Path, methodName);
            AscetTransitionRef transitionRef = BuildTransitionRef(transition);
            string targetName = transitionRef == null ? AscetComponentWriteUtilities.DescribeTransitionSelector(selector) : (transitionRef.SourceName + "->" + transitionRef.TargetName);
            AbstractMethod previousMethod = getter(transition);
            string previousValue = previousMethod == null ? String.Empty : (previousMethod.GetName() ?? String.Empty);
            RequireComponentEditableInSession(session, stateMachine.Path, operation);
            AscetCodeWriteTransactionResult transaction = AscetCodeWriteTransaction.Execute(
                operation,
                previousValue,
                methodName,
                verifyReadback,
                delegate { return setter(transition, method.Method); },
                delegate { return session.GetCurrentDatabaseHandle().Save(); },
                delegate
                {
                    AbstractMethod readbackMethod = getter(transition);
                    return readbackMethod == null ? String.Empty : (readbackMethod.GetName() ?? String.Empty);
                });
            return BuildWriteResult(stateMachine, operation, targetName, transaction, verifyReadback);
        });
    }
    private State ResolveState(AscetSession session, AscetItemRef stateMachine, AscetStateSelector selector, string operation)
    {
        if (selector == null || String.IsNullOrWhiteSpace(selector.Name))
        {
            throw new AscetReadException("invalid_argument", operation, "State selector must include a state name.");
        }

        StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
        State[] states = diagram.GetAllStates();
        State match = null;
        if (states != null)
        {
            for (int i = 0; i < states.Length; i++)
            {
                State candidate = states[i];
                if (candidate == null || !String.Equals(candidate.GetName(), selector.Name, StringComparison.Ordinal))
                {
                    continue;
                }
                if (match != null)
                {
                    throw new AscetReadException("state_ambiguous", operation, "State selector '" + selector.Name + "' is ambiguous in component '" + stateMachine.Path + "'.");
                }
                match = candidate;
            }
        }

        if (match == null)
        {
            throw new AscetReadException("state_not_found", operation, "State '" + selector.Name + "' was not found in component '" + stateMachine.Path + "'.");
        }

        return match;
    }

    private Transition ResolveTransition(AscetSession session, AscetItemRef stateMachine, AscetTransitionSelector selector, string operation)
    {
        if (selector == null)
        {
            throw new AscetReadException("invalid_argument", operation, "Transition selector must not be null.");
        }

        StateMachineDiagram diagram = ResolveStateMachineDiagram(session, stateMachine);
        Transition[] transitions = diagram.GetAllTransitions();
        Transition match = null;
        if (transitions != null)
        {
            for (int i = 0; i < transitions.Length; i++)
            {
                Transition candidate = transitions[i];
                if (!MatchesTransitionSelector(candidate, selector))
                {
                    continue;
                }
                if (match != null)
                {
                    throw new AscetReadException("transition_ambiguous", operation, "Transition selector '" + AscetComponentWriteUtilities.DescribeTransitionSelector(selector) + "' is ambiguous in component '" + stateMachine.Path + "'.");
                }
                match = candidate;
            }
        }

        if (match == null)
        {
            throw new AscetReadException("transition_not_found", operation, "Transition selector '" + AscetComponentWriteUtilities.DescribeTransitionSelector(selector) + "' was not found in component '" + stateMachine.Path + "'.");
        }

        return match;
    }

    private bool MatchesTransitionSelector(Transition transition, AscetTransitionSelector selector)
    {
        if (transition == null)
        {
            return false;
        }

        AscetTransitionRef reference = BuildTransitionRef(transition);
        if (reference == null)
        {
            return false;
        }

        if (!String.IsNullOrWhiteSpace(selector.Name) && !String.Equals(reference.Name, selector.Name, StringComparison.Ordinal))
        {
            return false;
        }
        if (!String.IsNullOrWhiteSpace(selector.SourceName) && !String.Equals(reference.SourceName, selector.SourceName, StringComparison.Ordinal))
        {
            return false;
        }
        if (!String.IsNullOrWhiteSpace(selector.TargetName) && !String.Equals(reference.TargetName, selector.TargetName, StringComparison.Ordinal))
        {
            return false;
        }
        if (selector.Priority.HasValue && transition.GetPriority() != selector.Priority.Value)
        {
            return false;
        }
        return true;
    }

    private AscetStateMachineWriteResult BuildWriteResult(AscetItemRef stateMachine, string operation, string targetName, AscetCodeWriteTransactionResult transaction, bool verifyReadback)
    {
        return new AscetStateMachineWriteResult
        {
            ComponentPath = stateMachine.Path,
            LanguageKind = stateMachine.LanguageKind,
            Operation = operation,
            TargetName = targetName,
            PreviousValue = transaction.PreviousValue,
            NewValue = transaction.NewValue,
            WriteSucceeded = true,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = transaction.Verified,
            Changed = transaction.Changed,
            MutationStatus = transaction.MutationStatus,
            SaveAttempted = transaction.SaveAttempted,
            SaveSucceeded = transaction.SaveSucceeded,
            SaveState = transaction.SaveState,
            Verified = transaction.Verified,
            VerificationMode = transaction.VerificationMode,
            SessionCount = transaction.SessionCount,
            SaveCount = transaction.SaveCount,
            EditableRetryCount = transaction.EditableRetryCount,
            NativeMutationAttemptCount = transaction.NativeMutationAttemptCount
        };
    }
}

public sealed class ComponentWriteRouter : IComponentWriteRouter
{
    private readonly IClassWriteService classWriteService;
    private readonly ITextCodeWriteService textCodeWriteService;
    private readonly IModuleWriteService moduleWriteService;
    private readonly IStateMachineWriteService stateMachineWriteService;

    public ComponentWriteRouter() : this(new ClassWriteService(), new TextCodeWriteService(), new ModuleWriteService(), new StateMachineWriteService()) { }

    public ComponentWriteRouter(IClassWriteService classWriteService, ITextCodeWriteService textCodeWriteService, IModuleWriteService moduleWriteService, IStateMachineWriteService stateMachineWriteService)
    {
        this.classWriteService = classWriteService;
        this.textCodeWriteService = textCodeWriteService;
        this.moduleWriteService = moduleWriteService;
        this.stateMachineWriteService = stateMachineWriteService;
    }

    public AscetComponentWriteCapabilities GetCapabilities(AscetItemRef component)
    {
        return AscetComponentWriteUtilities.GetCapabilities(component);
    }

    public AscetMethodWriteResult SetMethodCode(AscetItemRef component, string methodName, string code, bool verifyReadback)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "set_component_method_code", "Component reference must not be null.");
        }

        switch (component.Kind)
        {
            case AscetComponentKind.Class:
                return classWriteService.SetMethodCode(AscetClassDomainUtilities.ToClassRef(component), methodName, code, verifyReadback);
            case AscetComponentKind.Module:
                return moduleWriteService.SetMethodCode(component, methodName, code, verifyReadback);
            case AscetComponentKind.StateMachine:
                return stateMachineWriteService.SetMethodCode(component, methodName, code, verifyReadback);
            default:
                throw new AscetReadException("unsupported_component_kind", "set_component_method_code", "Item '" + component.Path + "' is not writable via the component router.");
        }
    }

    public AscetTextCodeWriteResult SetHeader(AscetItemRef component, string code, bool verifyReadback)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "set_component_header", "Component reference must not be null.");
        }
        switch (component.Kind)
        {
            case AscetComponentKind.Class:
                return textCodeWriteService.SetHeader(component, code, verifyReadback);
            case AscetComponentKind.Module:
                return moduleWriteService.SetHeader(component, code, verifyReadback);
            default:
                throw new AscetReadException("unsupported_component_kind", "set_component_header", "Header code is only supported for C classes/modules.");
        }
    }

    public AscetTextCodeWriteResult SetExternalCCode(AscetItemRef component, string code, bool verifyReadback)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "set_component_external_c_code", "Component reference must not be null.");
        }
        switch (component.Kind)
        {
            case AscetComponentKind.Class:
                return textCodeWriteService.SetExternalCCode(component, code, verifyReadback);
            case AscetComponentKind.Module:
                return moduleWriteService.SetExternalCCode(component, code, verifyReadback);
            default:
                throw new AscetReadException("unsupported_component_kind", "set_component_external_c_code", "External C code is only supported for C classes/modules.");
        }
    }

    public AscetStateMachineWriteResult SetStateEntryActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback) { return stateMachineWriteService.SetStateEntryActionEsdl(stateMachine, selector, code, verifyReadback); }
    public AscetStateMachineWriteResult SetStateExitActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback) { return stateMachineWriteService.SetStateExitActionEsdl(stateMachine, selector, code, verifyReadback); }
    public AscetStateMachineWriteResult SetStateStaticActionEsdl(AscetItemRef stateMachine, AscetStateSelector selector, string code, bool verifyReadback) { return stateMachineWriteService.SetStateStaticActionEsdl(stateMachine, selector, code, verifyReadback); }
    public AscetStateMachineWriteResult BindStateEntryActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback) { return stateMachineWriteService.BindStateEntryActionMethod(stateMachine, selector, methodName, verifyReadback); }
    public AscetStateMachineWriteResult BindStateExitActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback) { return stateMachineWriteService.BindStateExitActionMethod(stateMachine, selector, methodName, verifyReadback); }
    public AscetStateMachineWriteResult BindStateStaticActionMethod(AscetItemRef stateMachine, AscetStateSelector selector, string methodName, bool verifyReadback) { return stateMachineWriteService.BindStateStaticActionMethod(stateMachine, selector, methodName, verifyReadback); }
    public AscetStateMachineWriteResult SetTransitionConditionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback) { return stateMachineWriteService.SetTransitionConditionEsdl(stateMachine, selector, code, verifyReadback); }
    public AscetStateMachineWriteResult SetTransitionActionEsdl(AscetItemRef stateMachine, AscetTransitionSelector selector, string code, bool verifyReadback) { return stateMachineWriteService.SetTransitionActionEsdl(stateMachine, selector, code, verifyReadback); }
    public AscetStateMachineWriteResult BindTransitionConditionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback) { return stateMachineWriteService.BindTransitionConditionMethod(stateMachine, selector, methodName, verifyReadback); }
    public AscetStateMachineWriteResult BindTransitionActionMethod(AscetItemRef stateMachine, AscetTransitionSelector selector, string methodName, bool verifyReadback) { return stateMachineWriteService.BindTransitionActionMethod(stateMachine, selector, methodName, verifyReadback); }
    public AscetStateMachineWriteResult SetStartState(AscetItemRef stateMachine, AscetStateSelector selector, bool verifyReadback) { return stateMachineWriteService.SetStartState(stateMachine, selector, verifyReadback); }
}
