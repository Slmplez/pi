using System;
using System.Collections;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public enum AscetMethodReturnExistsBehavior
{
    Fail = 0,
    Keep = 1,
    Replace = 2
}

public enum AscetMethodArgumentExistsBehavior
{
    Fail = 0,
    Keep = 1,
    Replace = 2
}

public sealed class AscetMethodSignatureSpec
{
    public AscetMethodSignatureSpec()
    {
        Arguments = new List<AscetMethodArgumentSpec>();
        IfReturnExists = AscetMethodReturnExistsBehavior.Fail;
    }

    public string ReturnType { get; set; }
    public AscetMethodReturnExistsBehavior IfReturnExists { get; set; }
    public IList<AscetMethodArgumentSpec> Arguments { get; set; }
}

public sealed class AscetMethodArgumentSpec
{
    public AscetMethodArgumentSpec()
    {
        IfExists = AscetMethodArgumentExistsBehavior.Fail;
    }

    public string Name { get; set; }
    public string Type { get; set; }
    public AscetMethodArgumentExistsBehavior IfExists { get; set; }
}

public sealed class AscetMethodArgumentResult
{
    public string Name { get; set; }
    public string Type { get; set; }
    public bool Created { get; set; }
    public bool Replaced { get; set; }
    public bool AlreadyExisted { get; set; }
    public bool ReadbackVerified { get; set; }
    public bool IsMethodArgument { get; set; }
    public string ElementName { get; set; }
    public string ElementModelType { get; set; }
}

public sealed class AscetMethodSignatureResult
{
    public AscetMethodSignatureResult()
    {
        Arguments = new List<AscetMethodArgumentResult>();
    }

    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public string ReturnType { get; set; }
    public bool ReturnCreated { get; set; }
    public bool ReturnReplaced { get; set; }
    public bool ReturnAlreadyExisted { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string ReturnElementName { get; set; }
    public string ReturnElementModelType { get; set; }
    public bool ReturnElementIsMethodReturn { get; set; }
    public IList<AscetMethodArgumentResult> Arguments { get; set; }
    public string TargetKey { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetMethodSignatureElementSnapshot
{
    public string Name { get; set; }
    public string ElementName { get; set; }
    public string ModelType { get; set; }
    public bool Exists { get; set; }
    public bool IsMethodReturn { get; set; }
    public bool IsMethodArgument { get; set; }
}

public sealed class AscetMethodSignatureSnapshot
{
    public AscetMethodSignatureSnapshot()
    {
        Return = new AscetMethodSignatureElementSnapshot();
        Arguments = new List<AscetMethodSignatureElementSnapshot>();
    }

    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public string MethodName { get; set; }
    public AscetMethodKind MethodKind { get; set; }
    public bool SupportsPrimitiveSignature { get; set; }
    public string UnsupportedReason { get; set; }
    public AscetMethodSignatureElementSnapshot Return { get; set; }
    public IList<AscetMethodSignatureElementSnapshot> Arguments { get; set; }
    public string TargetKey { get; set; }
    public string Summary { get; set; }
}

public interface IMethodSignatureService
{
    AscetMethodSignatureResult SetPrimitiveReturn(string componentPath, string methodName, string returnType, AscetMethodReturnExistsBehavior ifReturnExists, bool verifyReadback);
    AscetMethodSignatureResult ApplySignature(string componentPath, string methodName, AscetMethodSignatureSpec spec, bool verifyReadback);
    AscetMethodSignatureSnapshot ReadSignature(string componentPath, string methodName);
}

public sealed class MethodSignatureService : MethodCatalogService, IMethodSignatureService
{
    public AscetMethodSignatureResult SetPrimitiveReturn(string componentPath, string methodName, string returnType, AscetMethodReturnExistsBehavior ifReturnExists, bool verifyReadback)
    {
        AscetMethodSignatureSpec spec = new AscetMethodSignatureSpec
        {
            ReturnType = returnType,
            IfReturnExists = ifReturnExists
        };
        return ApplySignature(componentPath, methodName, spec, verifyReadback);
    }

    public AscetMethodSignatureResult ApplySignature(string componentPath, string methodName, AscetMethodSignatureSpec spec, bool verifyReadback)
    {
        return ExecuteWithSession("set_method_signature", delegate(AscetSession session)
        {
            return ApplySignatureInSession(session, componentPath, methodName, spec, verifyReadback);
        });
    }

    public AscetMethodSignatureSnapshot ReadSignature(string componentPath, string methodName)
    {
        return ExecuteWithSession("read_method_signature", delegate(AscetSession session)
        {
            return ReadSignatureInSession(session, componentPath, methodName);
        });
    }

    internal AscetMethodSignatureResult SetPrimitiveReturnInSession(AscetSession session, string componentPath, string methodName, string returnType, AscetMethodReturnExistsBehavior ifReturnExists, bool verifyReadback)
    {
        AscetMethodSignatureSpec spec = new AscetMethodSignatureSpec
        {
            ReturnType = returnType,
            IfReturnExists = ifReturnExists
        };
        return ApplySignatureInSession(session, componentPath, methodName, spec, verifyReadback);
    }

    internal AscetMethodSignatureResult ApplySignatureInSession(AscetSession session, string componentPath, string methodName, AscetMethodSignatureSpec spec, bool verifyReadback)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Method name must not be empty.");
        }

        AscetMethodSignatureSpec normalizedSpec = NormalizeSignatureSpec(spec);
        if (String.IsNullOrWhiteSpace(normalizedSpec.ReturnType) && (normalizedSpec.Arguments == null || normalizedSpec.Arguments.Count == 0))
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "At least one returnType or argument is required.");
        }

        return ExecuteWithBoundSession("set_method_signature", session, delegate(AscetSession currentSession)
        {
            DataBaseItem item = ResolveItemByPath(currentSession, componentPath);
            AscetItemRef component = Classifier.ToItemRef(item);
            MethodHandle handle = FindMethodHandle(CollectMethodHandles(currentSession, component), component.Path, methodName.Trim());
            DiscreteMethod method = handle.Method as DiscreteMethod;
            if (method == null)
            {
                throw new AscetReadException(
                    "unsupported_method_kind",
                    "set_method_signature",
                    "Method '" + methodName + "' in component '" + componentPath + "' does not support primitive method signatures.");
            }

            RequireComponentEditableInSession(currentSession, componentPath, "set_method_signature");
            ReturnPatchResult returnPatch = ApplyReturnPatch(method, methodName, normalizedSpec.ReturnType, normalizedSpec.IfReturnExists);
            IList<AscetMethodArgumentResult> argumentResults = ApplyArgumentPatches(method, methodName, normalizedSpec.Arguments, verifyReadback);
            AscetModelElement readback = String.IsNullOrWhiteSpace(normalizedSpec.ReturnType) ? method.GetReturnElement() : method.GetReturnElement();
            AscetMethodSignatureResult result = BuildResult(
                component,
                handle.Reference,
                normalizedSpec.ReturnType,
                returnPatch.Created,
                returnPatch.Replaced,
                returnPatch.AlreadyExisted,
                verifyReadback,
                readback,
                argumentResults);
            if (verifyReadback && !result.ReadbackVerified)
            {
                throw new AscetReadException(
                    "readback_mismatch",
                    "set_method_signature",
                    "Return signature readback failed for method '" + methodName + "' in component '" + componentPath + "'.");
            }

            if (verifyReadback)
            {
                for (int i = 0; i < argumentResults.Count; i++)
                {
                    if (!argumentResults[i].ReadbackVerified)
                    {
                        throw new AscetReadException(
                            "readback_mismatch",
                            "set_method_signature",
                            "Argument signature readback failed for argument '" + argumentResults[i].Name + "' in method '" + methodName + "'.");
                    }
                }
            }

            return result;
        });
    }

    internal AscetMethodSignatureSnapshot ReadSignatureInSession(AscetSession session, string componentPath, string methodName)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "read_method_signature", "Component path must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "read_method_signature", "Method name must not be empty.");
        }

        return ExecuteWithBoundSession("read_method_signature", session, delegate(AscetSession currentSession)
        {
            DataBaseItem item = ResolveItemByPath(currentSession, componentPath);
            AscetItemRef component = Classifier.ToItemRef(item);
            MethodHandle handle = FindMethodHandle(CollectMethodHandles(currentSession, component), component.Path, methodName.Trim());
            DiscreteMethod method = handle.Method as DiscreteMethod;
            if (method == null)
            {
                return BuildReadSnapshot(
                    component,
                    handle.Reference,
                    false,
                    "unsupported_method_kind",
                    null,
                    new List<AscetModelElement>());
            }

            AscetModelElement returnElement = method.GetReturnElement();
            IList<AscetModelElement> arguments = method.GetAllArgumentElements() ?? new AscetModelElement[0];
            return BuildReadSnapshot(component, handle.Reference, true, String.Empty, returnElement, arguments);
        });
    }

    public static string NormalizeReturnType(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "cont":
            case "sdisc":
            case "udisc":
            case "log":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "set_method_signature", "Return type must be one of cont, sdisc, udisc, or log.");
        }
    }

    public static AscetMethodReturnExistsBehavior ParseIfReturnExists(string value)
    {
        string normalized = String.IsNullOrWhiteSpace(value) ? "fail" : value.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return AscetMethodReturnExistsBehavior.Fail;
            case "keep":
                return AscetMethodReturnExistsBehavior.Keep;
            case "replace":
                return AscetMethodReturnExistsBehavior.Replace;
            default:
                throw new AscetReadException("invalid_argument", "set_method_signature", "ifReturnExists must be fail, keep, or replace.");
        }
    }

    public static AscetMethodArgumentExistsBehavior ParseIfArgumentExists(string value)
    {
        string normalized = String.IsNullOrWhiteSpace(value) ? "fail" : value.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return AscetMethodArgumentExistsBehavior.Fail;
            case "keep":
                return AscetMethodArgumentExistsBehavior.Keep;
            case "replace":
                return AscetMethodArgumentExistsBehavior.Replace;
            default:
                throw new AscetReadException("invalid_argument", "set_method_signature", "argument ifExists must be fail, keep, or replace.");
        }
    }

    public static AscetMethodSignatureSpec ParseSignatureSpec(Dictionary<string, object> payload)
    {
        if (payload == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Signature JSON must be an object.");
        }

        AscetMethodSignatureSpec spec = new AscetMethodSignatureSpec();
        spec.ReturnType = GetOptionalString(payload, "returnType");
        spec.IfReturnExists = ParseIfReturnExists(GetOptionalString(payload, "ifReturnExists"));
        spec.Arguments = ParseArgumentSpecs(payload);
        return NormalizeSignatureSpec(spec);
    }

    public static Dictionary<string, object> BuildPayload(AscetMethodSignatureResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["methodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["methodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["returnType"] = result == null ? String.Empty : (result.ReturnType ?? String.Empty);
        payload["returnCreated"] = result != null && result.ReturnCreated;
        payload["returnReplaced"] = result != null && result.ReturnReplaced;
        payload["returnAlreadyExisted"] = result != null && result.ReturnAlreadyExisted;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["returnElementName"] = result == null ? String.Empty : (result.ReturnElementName ?? String.Empty);
        payload["returnElementModelType"] = result == null ? String.Empty : (result.ReturnElementModelType ?? String.Empty);
        payload["returnElementIsMethodReturn"] = result != null && result.ReturnElementIsMethodReturn;
        payload["arguments"] = BuildArgumentPayload(result == null ? null : result.Arguments);
        payload["targetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return payload;
    }

    public static Dictionary<string, object> BuildReadPayload(AscetMethodSignatureSnapshot snapshot)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["componentPath"] = snapshot == null ? String.Empty : (snapshot.ComponentPath ?? String.Empty);
        payload["componentKind"] = snapshot == null ? AscetComponentKind.Unknown.ToString() : snapshot.ComponentKind.ToString();
        payload["languageKind"] = snapshot == null ? AscetLanguageKind.Unknown.ToString() : snapshot.LanguageKind.ToString();
        payload["methodName"] = snapshot == null ? String.Empty : (snapshot.MethodName ?? String.Empty);
        payload["methodKind"] = snapshot == null ? AscetMethodKind.Unknown.ToString() : snapshot.MethodKind.ToString();
        payload["supportsPrimitiveSignature"] = snapshot != null && snapshot.SupportsPrimitiveSignature;
        payload["unsupportedReason"] = snapshot == null ? String.Empty : (snapshot.UnsupportedReason ?? String.Empty);
        payload["return"] = BuildReadElementPayload(snapshot == null ? null : snapshot.Return);
        payload["arguments"] = BuildReadElementPayload(snapshot == null ? null : snapshot.Arguments);
        payload["counts"] = BuildReadCountsPayload(snapshot);
        payload["targetKey"] = snapshot == null ? String.Empty : (snapshot.TargetKey ?? String.Empty);
        payload["summary"] = snapshot == null ? String.Empty : (snapshot.Summary ?? String.Empty);
        return payload;
    }

    private static AscetMethodSignatureResult BuildResult(AscetItemRef component, AscetMethodRef method, string requestedReturnType, bool created, bool replaced, bool alreadyExisted, bool verifyReadback, AscetModelElement returnElement, IList<AscetMethodArgumentResult> arguments)
    {
        string modelType = GetReturnModelType(returnElement);
        bool isMethodReturn = returnElement != null && returnElement.IsMethodReturn();
        bool hasRequestedReturn = !String.IsNullOrWhiteSpace(requestedReturnType);
        bool readbackVerified = !verifyReadback || !hasRequestedReturn || (isMethodReturn && String.Equals(modelType, requestedReturnType, StringComparison.Ordinal));
        string componentPath = component == null ? String.Empty : (component.Path ?? String.Empty);
        string methodName = method == null ? String.Empty : (method.Name ?? String.Empty);

        return new AscetMethodSignatureResult
        {
            ComponentPath = componentPath,
            MethodName = methodName,
            MethodKind = method == null ? AscetMethodKind.Unknown : method.MethodKind,
            ReturnType = requestedReturnType,
            ReturnCreated = created,
            ReturnReplaced = replaced,
            ReturnAlreadyExisted = alreadyExisted,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            ReturnElementName = GetModelElementName(returnElement),
            ReturnElementModelType = modelType,
            ReturnElementIsMethodReturn = isMethodReturn,
            Arguments = arguments ?? new List<AscetMethodArgumentResult>(),
            TargetKey = componentPath + "::" + methodName + "::return",
            Summary = BuildSummary(componentPath, methodName, requestedReturnType, arguments)
        };
    }

    private static AscetMethodSignatureSnapshot BuildReadSnapshot(AscetItemRef component, AscetMethodRef method, bool supportsPrimitiveSignature, string unsupportedReason, AscetModelElement returnElement, IList<AscetModelElement> arguments)
    {
        string componentPath = component == null ? String.Empty : (component.Path ?? String.Empty);
        string methodName = method == null ? String.Empty : (method.Name ?? String.Empty);
        List<AscetMethodSignatureElementSnapshot> argumentSnapshots = new List<AscetMethodSignatureElementSnapshot>();
        if (arguments != null)
        {
            for (int i = 0; i < arguments.Count; i++)
            {
                argumentSnapshots.Add(BuildReadElementSnapshot(arguments[i], GetMethodArgumentName(methodName, arguments[i])));
            }
        }

        return new AscetMethodSignatureSnapshot
        {
            ComponentPath = componentPath,
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            MethodName = methodName,
            MethodKind = method == null ? AscetMethodKind.Unknown : method.MethodKind,
            SupportsPrimitiveSignature = supportsPrimitiveSignature,
            UnsupportedReason = unsupportedReason ?? String.Empty,
            Return = BuildReadElementSnapshot(returnElement, "return"),
            Arguments = argumentSnapshots,
            TargetKey = componentPath + "::" + methodName + "::signature",
            Summary = BuildReadSummary(componentPath, methodName, supportsPrimitiveSignature, returnElement, argumentSnapshots)
        };
    }

    private static ReturnPatchResult ApplyReturnPatch(DiscreteMethod method, string methodName, string returnType, AscetMethodReturnExistsBehavior ifReturnExists)
    {
        ReturnPatchResult result = new ReturnPatchResult();
        if (String.IsNullOrWhiteSpace(returnType))
        {
            return result;
        }

        AscetModelElement existing = method.GetReturnElement();
        result.AlreadyExisted = existing != null;
        string existingModelType = GetReturnModelType(existing);
        if (existing != null)
        {
            if (ifReturnExists == AscetMethodReturnExistsBehavior.Fail)
            {
                throw new AscetReadException(
                    "method_return_already_exists",
                    "set_method_signature",
                    "Method '" + methodName + "' already has a return element of type '" + existingModelType + "'.");
            }

            if (ifReturnExists == AscetMethodReturnExistsBehavior.Keep)
            {
                if (!String.Equals(existingModelType, returnType, StringComparison.Ordinal))
                {
                    throw new AscetReadException(
                        "method_return_type_mismatch",
                        "set_method_signature",
                        "Method '" + methodName + "' already has return type '" + existingModelType + "', not requested type '" + returnType + "'.");
                }

                return result;
            }

            if (!method.RemoveReturnElement())
            {
                throw new AscetReadException(
                    "remove_return_failed",
                    "set_method_signature",
                    "ASCET returned false while removing the existing return element for method '" + methodName + "'.");
            }

            result.Replaced = true;
        }

        PrimitiveModelElement added = method.AddPrimitiveReturnElement(returnType);
        if (added == null)
        {
            throw new AscetReadException(
                "add_return_failed",
                "set_method_signature",
                "ASCET returned null while adding primitive return type '" + returnType + "' to method '" + methodName + "'.");
        }

        result.Created = true;
        return result;
    }

    private static IList<AscetMethodArgumentResult> ApplyArgumentPatches(DiscreteMethod method, string methodName, IList<AscetMethodArgumentSpec> arguments, bool verifyReadback)
    {
        List<AscetMethodArgumentResult> results = new List<AscetMethodArgumentResult>();
        if (arguments == null)
        {
            return results;
        }

        for (int i = 0; i < arguments.Count; i++)
        {
            AscetMethodArgumentSpec argument = arguments[i];
            AscetModelElement existing = method.GetArgumentElement(argument.Name);
            bool alreadyExisted = existing != null;
            bool replaced = false;
            bool created = false;
            string existingModelType = GetPrimitiveModelType(existing);

            if (existing != null)
            {
                if (argument.IfExists == AscetMethodArgumentExistsBehavior.Fail)
                {
                    throw new AscetReadException(
                        "method_argument_already_exists",
                        "set_method_signature",
                        "Method '" + methodName + "' already has argument '" + argument.Name + "' of type '" + existingModelType + "'.");
                }

                if (argument.IfExists == AscetMethodArgumentExistsBehavior.Keep)
                {
                    if (!String.Equals(existingModelType, argument.Type, StringComparison.Ordinal))
                    {
                        throw new AscetReadException(
                            "method_argument_type_mismatch",
                            "set_method_signature",
                            "Method '" + methodName + "' already has argument '" + argument.Name + "' of type '" + existingModelType + "', not requested type '" + argument.Type + "'.");
                    }
                }
                else
                {
                    if (!method.RemoveArgumentElement(existing))
                    {
                        throw new AscetReadException(
                            "remove_argument_failed",
                            "set_method_signature",
                            "ASCET returned false while removing argument '" + argument.Name + "' from method '" + methodName + "'.");
                    }

                    replaced = true;
                    PrimitiveModelElement added = method.AddPrimitiveArgumentElement(argument.Name, argument.Type);
                    if (added == null)
                    {
                        throw new AscetReadException(
                            "add_argument_failed",
                            "set_method_signature",
                            "ASCET returned null while adding primitive argument '" + argument.Name + "' to method '" + methodName + "'.");
                    }

                    created = true;
                }
            }
            else
            {
                PrimitiveModelElement added = method.AddPrimitiveArgumentElement(argument.Name, argument.Type);
                if (added == null)
                {
                    throw new AscetReadException(
                        "add_argument_failed",
                        "set_method_signature",
                        "ASCET returned null while adding primitive argument '" + argument.Name + "' to method '" + methodName + "'.");
                }

                created = true;
            }

            AscetModelElement readback = method.GetArgumentElement(argument.Name);
            string readbackModelType = GetPrimitiveModelType(readback);
            bool isMethodArgument = readback != null && readback.IsMethodArgument();
            results.Add(new AscetMethodArgumentResult
            {
                Name = argument.Name,
                Type = argument.Type,
                Created = created,
                Replaced = replaced,
                AlreadyExisted = alreadyExisted,
                ReadbackVerified = !verifyReadback || (isMethodArgument && String.Equals(readbackModelType, argument.Type, StringComparison.Ordinal)),
                IsMethodArgument = isMethodArgument,
                ElementName = GetModelElementName(readback),
                ElementModelType = readbackModelType
            });
        }

        return results;
    }

    private static AscetMethodSignatureSpec NormalizeSignatureSpec(AscetMethodSignatureSpec spec)
    {
        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Signature spec is required.");
        }

        AscetMethodSignatureSpec normalized = new AscetMethodSignatureSpec();
        normalized.ReturnType = String.IsNullOrWhiteSpace(spec.ReturnType) ? String.Empty : NormalizeReturnType(spec.ReturnType);
        normalized.IfReturnExists = spec.IfReturnExists;
        normalized.Arguments = new List<AscetMethodArgumentSpec>();
        if (spec.Arguments != null)
        {
            for (int i = 0; i < spec.Arguments.Count; i++)
            {
                AscetMethodArgumentSpec argument = spec.Arguments[i];
                if (argument == null)
                {
                    throw new AscetReadException("invalid_argument", "set_method_signature", "Argument spec must not be null.");
                }

                normalized.Arguments.Add(new AscetMethodArgumentSpec
                {
                    Name = NormalizeArgumentName(argument.Name),
                    Type = NormalizeReturnType(argument.Type),
                    IfExists = argument.IfExists
                });
            }
        }

        return normalized;
    }

    private static string NormalizeArgumentName(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Argument name must not be empty.");
        }

        return value.Trim();
    }

    private static IList<AscetMethodArgumentSpec> ParseArgumentSpecs(Dictionary<string, object> payload)
    {
        List<AscetMethodArgumentSpec> result = new List<AscetMethodArgumentSpec>();
        object raw;
        if (payload == null || !payload.TryGetValue("arguments", out raw) || raw == null)
        {
            return result;
        }

        IList list = raw as IList;
        if (list == null)
        {
            throw new AscetReadException("invalid_argument", "set_method_signature", "Signature field 'arguments' must be an array.");
        }

        for (int i = 0; i < list.Count; i++)
        {
            Dictionary<string, object> entry = list[i] as Dictionary<string, object>;
            if (entry == null)
            {
                throw new AscetReadException("invalid_argument", "set_method_signature", "Each signature argument must be an object.");
            }

            result.Add(new AscetMethodArgumentSpec
            {
                Name = GetOptionalString(entry, "name"),
                Type = GetOptionalString(entry, "type"),
                IfExists = ParseIfArgumentExists(GetOptionalString(entry, "ifExists"))
            });
        }

        return result;
    }

    private static string GetOptionalString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static List<Dictionary<string, object>> BuildArgumentPayload(IList<AscetMethodArgumentResult> arguments)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (arguments == null)
        {
            return result;
        }

        for (int i = 0; i < arguments.Count; i++)
        {
            AscetMethodArgumentResult argument = arguments[i];
            Dictionary<string, object> entry = new Dictionary<string, object>(StringComparer.Ordinal);
            entry["name"] = argument == null ? String.Empty : (argument.Name ?? String.Empty);
            entry["type"] = argument == null ? String.Empty : (argument.Type ?? String.Empty);
            entry["created"] = argument != null && argument.Created;
            entry["replaced"] = argument != null && argument.Replaced;
            entry["alreadyExisted"] = argument != null && argument.AlreadyExisted;
            entry["readbackVerified"] = argument != null && argument.ReadbackVerified;
            entry["isMethodArgument"] = argument != null && argument.IsMethodArgument;
            entry["elementName"] = argument == null ? String.Empty : (argument.ElementName ?? String.Empty);
            entry["elementModelType"] = argument == null ? String.Empty : (argument.ElementModelType ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static Dictionary<string, object> BuildReadElementPayload(AscetMethodSignatureElementSnapshot element)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>(StringComparer.Ordinal);
        payload["exists"] = element != null && element.Exists;
        payload["name"] = element == null ? String.Empty : (element.Name ?? String.Empty);
        payload["elementName"] = element == null ? String.Empty : (element.ElementName ?? String.Empty);
        payload["modelType"] = element == null ? String.Empty : (element.ModelType ?? String.Empty);
        payload["isMethodReturn"] = element != null && element.IsMethodReturn;
        payload["isMethodArgument"] = element != null && element.IsMethodArgument;
        return payload;
    }

    private static List<Dictionary<string, object>> BuildReadElementPayload(IList<AscetMethodSignatureElementSnapshot> elements)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (elements == null)
        {
            return result;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            result.Add(BuildReadElementPayload(elements[i]));
        }

        return result;
    }

    private static Dictionary<string, object> BuildReadCountsPayload(AscetMethodSignatureSnapshot snapshot)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>(StringComparer.Ordinal);
        counts["arguments"] = snapshot == null || snapshot.Arguments == null ? 0 : snapshot.Arguments.Count;
        counts["return"] = snapshot != null && snapshot.Return != null && snapshot.Return.Exists ? 1 : 0;
        return counts;
    }

    private static AscetMethodSignatureElementSnapshot BuildReadElementSnapshot(AscetModelElement element, string name)
    {
        string elementName = GetModelElementName(element);
        return new AscetMethodSignatureElementSnapshot
        {
            Name = name ?? String.Empty,
            ElementName = elementName,
            ModelType = GetPrimitiveModelType(element),
            Exists = element != null,
            IsMethodReturn = element != null && element.IsMethodReturn(),
            IsMethodArgument = element != null && element.IsMethodArgument()
        };
    }

    private static string GetMethodArgumentName(string methodName, AscetModelElement element)
    {
        string elementName = GetModelElementName(element);
        if (String.IsNullOrWhiteSpace(elementName))
        {
            return String.Empty;
        }

        string prefix = (methodName ?? String.Empty).Trim() + "\\";
        if (!String.IsNullOrWhiteSpace(prefix) && elementName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return elementName.Substring(prefix.Length);
        }

        int separator = elementName.LastIndexOf('\\');
        if (separator >= 0 && separator + 1 < elementName.Length)
        {
            return elementName.Substring(separator + 1);
        }

        return elementName;
    }

    private static string BuildReadSummary(string componentPath, string methodName, bool supportsPrimitiveSignature, AscetModelElement returnElement, IList<AscetMethodSignatureElementSnapshot> arguments)
    {
        if (!supportsPrimitiveSignature)
        {
            return "Method '" + methodName + "' in " + componentPath + " does not support primitive method signatures.";
        }

        int argumentCount = arguments == null ? 0 : arguments.Count;
        string returnType = GetPrimitiveModelType(returnElement);
        if (String.IsNullOrWhiteSpace(returnType))
        {
            return "Read method signature for '" + methodName + "' in " + componentPath + ": no return, " + argumentCount + " argument(s).";
        }

        return "Read method signature for '" + methodName + "' in " + componentPath + ": return '" + returnType + "', " + argumentCount + " argument(s).";
    }

    private static string BuildSummary(string componentPath, string methodName, string returnType, IList<AscetMethodArgumentResult> arguments)
    {
        int argumentCount = arguments == null ? 0 : arguments.Count;
        if (!String.IsNullOrWhiteSpace(returnType) && argumentCount > 0)
        {
            return "Set return type '" + returnType + "' and " + argumentCount + " argument(s) for method '" + methodName + "' in " + componentPath + ".";
        }

        if (argumentCount > 0)
        {
            return "Set " + argumentCount + " argument(s) for method '" + methodName + "' in " + componentPath + ".";
        }

        return "Set return type '" + returnType + "' for method '" + methodName + "' in " + componentPath + ".";
    }

    private static string GetReturnModelType(AscetModelElement element)
    {
        return GetPrimitiveModelType(element);
    }

    private static string GetPrimitiveModelType(AscetModelElement element)
    {
        PrimitiveModelElement primitive = element as PrimitiveModelElement;
        if (primitive == null)
        {
            return String.Empty;
        }

        return primitive.GetModelType() ?? String.Empty;
    }

    private static string GetModelElementName(AscetModelElement element)
    {
        if (element == null)
        {
            return String.Empty;
        }

        return element.GetName() ?? String.Empty;
    }

    private sealed class ReturnPatchResult
    {
        public bool Created { get; set; }
        public bool Replaced { get; set; }
        public bool AlreadyExisted { get; set; }
    }
}
