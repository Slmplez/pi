using System;
using System.Collections.Generic;

public sealed class MethodConsistencySnapshot
{
    public MethodConsistencySnapshot()
    {
        PreviousCode = String.Empty;
    }

    public string PreviousCode { get; set; }
}

public interface IMethodConsistencyService
{
    MethodConsistencySnapshot Capture(AscetItemRef component, string methodName);
    MethodCodeConsistencyResult Validate(AscetItemRef component, string methodName, string expectedCode);
    bool VerifyRollback(AscetItemRef component, string methodName, string expectedCode);
}

public sealed class MethodConsistencyService : IMethodConsistencyService
{
    private readonly IMethodCodeService methodCodes;
    private readonly IComponentElementSyncService elements;
    private readonly IMethodCatalogService methods;
    private readonly IMethodSignatureService signatures;

    public MethodConsistencyService()
        : this(new MethodCatalogService(), new ComponentElementSyncService(), new MethodCatalogService(), new MethodSignatureService())
    {
    }

    public MethodConsistencyService(
        IMethodCodeService methodCodes,
        IComponentElementSyncService elements,
        IMethodCatalogService methods,
        IMethodSignatureService signatures)
    {
        this.methodCodes = methodCodes ?? new MethodCatalogService();
        this.elements = elements ?? new ComponentElementSyncService();
        this.methods = methods ?? new MethodCatalogService();
        this.signatures = signatures ?? new MethodSignatureService();
    }

    public MethodConsistencySnapshot Capture(AscetItemRef component, string methodName)
    {
        AscetMethodCode current = methodCodes.GetMethodCode(RequireComponent(component), RequireMethodName(methodName));
        return new MethodConsistencySnapshot
        {
            PreviousCode = current == null ? String.Empty : (current.Code ?? String.Empty)
        };
    }

    public MethodCodeConsistencyResult Validate(AscetItemRef component, string methodName, string expectedCode)
    {
        AscetItemRef target = RequireComponent(component);
        string targetMethod = RequireMethodName(methodName);
        AscetMethodCode current = methodCodes.GetMethodCode(target, targetMethod);
        AscetElementCatalogReadResult catalog = elements.ReadCatalog(target);
        IList<AscetMethodRef> methodCatalog = methods.ListMethods(target);
        AscetMethodSignatureSnapshot signature = signatures.ReadSignature(target.Path, targetMethod);

        return MethodCodeConsistencyValidator.Validate(new MethodCodeConsistencyRequest
        {
            ComponentPath = target.Path ?? String.Empty,
            MethodName = targetMethod,
            ExpectedCode = expectedCode ?? String.Empty,
            ActualCode = current == null ? String.Empty : (current.Code ?? String.Empty),
            Elements = catalog == null || catalog.Document == null || catalog.Document.Elements == null
                ? new List<AscetElementSpec>()
                : catalog.Document.Elements,
            MethodNames = BuildMethodNames(methodCatalog),
            SignatureNames = BuildSignatureNames(signature)
        });
    }

    public bool VerifyRollback(AscetItemRef component, string methodName, string expectedCode)
    {
        AscetMethodCode current = methodCodes.GetMethodCode(RequireComponent(component), RequireMethodName(methodName));
        return String.Equals(current == null ? String.Empty : (current.Code ?? String.Empty), expectedCode ?? String.Empty, StringComparison.Ordinal);
    }

    private static AscetItemRef RequireComponent(AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "validate_method_consistency", "Component reference must not be null.");
        }
        return component;
    }

    private static string RequireMethodName(string methodName)
    {
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "validate_method_consistency", "Method name must not be empty.");
        }
        return methodName.Trim();
    }

    private static IList<string> BuildMethodNames(IList<AscetMethodRef> methodCatalog)
    {
        List<string> result = new List<string>();
        if (methodCatalog == null)
        {
            return result;
        }
        for (int i = 0; i < methodCatalog.Count; i++)
        {
            AscetMethodRef method = methodCatalog[i];
            if (method != null && !String.IsNullOrWhiteSpace(method.Name))
            {
                result.Add(method.Name);
            }
        }
        return result;
    }

    private static IList<string> BuildSignatureNames(AscetMethodSignatureSnapshot signature)
    {
        List<string> result = new List<string>();
        if (signature == null)
        {
            return result;
        }
        AddSignatureName(result, signature.Return);
        if (signature.Arguments != null)
        {
            for (int i = 0; i < signature.Arguments.Count; i++)
            {
                AddSignatureName(result, signature.Arguments[i]);
            }
        }
        return result;
    }

    private static void AddSignatureName(List<string> target, AscetMethodSignatureElementSnapshot element)
    {
        if (target == null || element == null || !element.Exists)
        {
            return;
        }
        if (!String.IsNullOrWhiteSpace(element.Name))
        {
            target.Add(element.Name);
        }
        if (!String.IsNullOrWhiteSpace(element.ElementName))
        {
            target.Add(element.ElementName);
            int separator = element.ElementName.LastIndexOf('\\');
            if (separator >= 0 && separator + 1 < element.ElementName.Length)
            {
                target.Add(element.ElementName.Substring(separator + 1));
            }
        }
    }
}
