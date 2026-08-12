using System;
using System.Collections.Generic;

public static class AscetMethodConsistencyTest
{
    public static int Main()
    {
        TestMissingReferencedElementIsRejected();
        TestConsistencyFailureRollsBackPreviousCode();
        Console.WriteLine("AscetMethodConsistencyTest passed.");
        return 0;
    }

    private static void TestMissingReferencedElementIsRejected()
    {
        MethodCodeConsistencyRequest request = new MethodCodeConsistencyRequest
        {
            ComponentPath = "DEMO\\CM_AVH",
            MethodName = "calc",
            ExpectedCode = "C_AVH_DoubleBrakePressCount = C_AVH_DoubleBrakeWindow; C_AVH_DoubleBrakePrev = C_AVH_DoubleBrakeReq;",
            ActualCode = "C_AVH_DoubleBrakePressCount = C_AVH_DoubleBrakeWindow; C_AVH_DoubleBrakePrev = C_AVH_DoubleBrakeReq;",
            Elements = new List<AscetElementSpec>
            {
                ResolvedElement("C_AVH_DoubleBrakePressCount"),
                ResolvedElement("C_AVH_DoubleBrakeWindow"),
                ResolvedElement("C_AVH_DoubleBrakePrev")
            },
            MethodNames = new List<string> { "calc" },
            SignatureNames = new List<string>()
        };

        try
        {
            MethodCodeConsistencyValidator.Validate(request);
        }
        catch (AscetReadException error)
        {
            Equal("method_symbol_not_found", error.Code, "missing symbol error code");
            Contains(error.Message, "C_AVH_DoubleBrakeReq", "missing symbol message");
            return;
        }

        throw new InvalidOperationException("Expected method_symbol_not_found.");
    }

    private static void TestConsistencyFailureRollsBackPreviousCode()
    {
        FakeMethodWriter writer = new FakeMethodWriter("old();");
        FakeMethodConsistencyService consistency = new FakeMethodConsistencyService(writer, "old();");
        ExecMethodWriteService service = new ExecMethodWriteService(
            new FakeComponentLocator(),
            writer,
            new AscetWriteExecutor(),
            consistency);

        AscetWriteExecutionResult result = service.Execute(new SetMethodCodeWriteRequest
        {
            ComponentPath = "DEMO\\CM_AVH",
            MethodName = "calc",
            Code = "C_AVH_DoubleBrakeReq = true;",
            VerifyReadback = false
        });

        Equal(false, result.Succeeded, "consistency failure result");
        Equal("method_consistency_rolled_back", result.Error == null ? String.Empty : result.Error.Code, "rollback error code");
        Equal("old();", writer.CurrentCode, "previous code restored");
        Equal("C_AVH_DoubleBrakeReq = true;,old();", String.Join(",", writer.Writes.ToArray()), "write and rollback order");
        Equal(true, consistency.RollbackVerified, "rollback verification");
    }

    private static AscetElementSpec ResolvedElement(string name)
    {
        return new AscetElementSpec
        {
            Name = name,
            Kind = AscetElementSpecKind.Variable,
            ConfigurationProvenance = new AscetElementConfigurationProvenance
            {
                DataConfiguration = new AscetConfigurationProvenance
                {
                    Source = "defaultDataConfiguration",
                    ConfigurationName = "DefaultData",
                    Selected = true
                },
                ImplementationConfiguration = new AscetConfigurationProvenance
                {
                    Source = "defaultImplementationConfiguration",
                    ConfigurationName = "DefaultImpl",
                    Selected = true
                }
            }
        };
    }

    private sealed class FakeComponentLocator : IComponentLocatorService
    {
        public IList<AscetItemRef> ListTopFolders() { return new List<AscetItemRef>(); }
        public IList<AscetItemRef> ListItemsInFolder(string folderPath, bool recursive) { return new List<AscetItemRef>(); }
        public AscetItemRef GetItemByPath(string folderPath, string itemName) { return FindItemInFolder(itemName, folderPath); }
        public AscetItemRef FindItemInFolder(string itemName, string folderPath)
        {
            return new AscetItemRef
            {
                Name = itemName,
                Path = String.IsNullOrWhiteSpace(folderPath) ? itemName : folderPath + "\\" + itemName,
                Kind = AscetComponentKind.Module,
                LanguageKind = AscetLanguageKind.C
            };
        }
    }

    private sealed class FakeMethodWriter : IMethodWriteService
    {
        public FakeMethodWriter(string initialCode)
        {
            CurrentCode = initialCode;
            Writes = new List<string>();
        }

        public string CurrentCode { get; private set; }
        public List<string> Writes { get; private set; }

        public AscetMethodWriteResult SetMethodCode(AscetItemRef component, string methodName, string code, bool verifyReadback)
        {
            int previousLength = (CurrentCode ?? String.Empty).Length;
            CurrentCode = code ?? String.Empty;
            Writes.Add(CurrentCode);
            return new AscetMethodWriteResult
            {
                ComponentPath = component == null ? String.Empty : (component.Path ?? String.Empty),
                ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
                LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
                MethodName = methodName ?? String.Empty,
                MethodKind = AscetMethodKind.AbstractMethod,
                PreviousCodeLength = previousLength,
                NewCodeLength = CurrentCode.Length,
                WriteSucceeded = true,
                VerifyReadbackRequested = verifyReadback,
                ReadbackVerified = !verifyReadback
            };
        }
    }

    private sealed class FakeMethodConsistencyService : IMethodConsistencyService
    {
        private readonly FakeMethodWriter writer;
        private readonly string previousCode;

        public FakeMethodConsistencyService(FakeMethodWriter writer, string previousCode)
        {
            this.writer = writer;
            this.previousCode = previousCode;
        }

        public bool RollbackVerified { get; private set; }

        public MethodConsistencySnapshot Capture(AscetItemRef component, string methodName)
        {
            return new MethodConsistencySnapshot { PreviousCode = previousCode };
        }

        public MethodCodeConsistencyResult Validate(AscetItemRef component, string methodName, string expectedCode)
        {
            throw new AscetReadException("method_symbol_not_found", "validate_method_consistency", "Missing C_AVH_DoubleBrakeReq.");
        }

        public bool VerifyRollback(AscetItemRef component, string methodName, string expectedCode)
        {
            RollbackVerified = String.Equals(writer.CurrentCode, expectedCode, StringComparison.Ordinal);
            return RollbackVerified;
        }
    }

    private static void Equal(object expected, object actual, string message)
    {
        if (!Object.Equals(expected, actual)) throw new InvalidOperationException(message + ": expected=" + expected + ", actual=" + actual);
    }

    private static void Contains(string value, string expectedPart, string message)
    {
        if (String.IsNullOrEmpty(value) || value.IndexOf(expectedPart, StringComparison.Ordinal) < 0)
        {
            throw new InvalidOperationException(message + ": expected part=" + expectedPart + ", actual=" + (value ?? String.Empty));
        }
    }
}
