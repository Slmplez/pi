using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

public static class AscetTestBuildService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        Dictionary<string, object> contract = ResolveContract(request);
        AscetTestValidationResult validation = AscetTestContractValidator.ValidateRequest(request, contract);
        string runDirectory = String.Empty;
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-build/v1" },
            { "ready", false },
            { "runId", runId ?? String.Empty },
            { "componentPath", componentPath },
            { "liveWritePerformed", false },
            { "stages", new Dictionary<string, object>() },
            { "compileCommands", new List<object>() },
            { "cSources", new List<object>() },
            { "cppSources", new List<object>() },
            { "artifacts", new Dictionary<string, object>() }
        };

        try
        {
            runDirectory = AscetTestArtifactWriter.ResolveRunDirectory(request, runId);
            data["runDirectory"] = runDirectory;
        }
        catch (Exception ex)
        {
            validation.Errors.Add(Issue("runDirectory", "unsafe_path", ex.Message));
        }

        Dictionary<string, object> verification = AscetTestContracts.GetDictionary(request, "verification");
        string verificationProfile = AscetTestContracts.GetString(verification, "profile");
        bool requireExportManifest = AscetTestContracts.GetBoolean(verification, "requireExport", false) || String.Equals(verificationProfile, "live", StringComparison.OrdinalIgnoreCase);
        AscetTestExportManifestValidation manifestValidation = AscetTestExportManifestService.Validate(request, runDirectory, requireExportManifest);
        for (int manifestErrorIndex = 0; manifestErrorIndex < manifestValidation.Errors.Count; manifestErrorIndex++) validation.Errors.Add(manifestValidation.Errors[manifestErrorIndex]);
        for (int manifestWarningIndex = 0; manifestWarningIndex < manifestValidation.Warnings.Count; manifestWarningIndex++) validation.Warnings.Add(manifestValidation.Warnings[manifestWarningIndex]);
        data["exportManifestPath"] = manifestValidation.Path;
        data["exportManifest"] = manifestValidation.Manifest;

        Dictionary<string, object> toolchain = AscetTestContracts.GetDictionary(request, "toolchain");
        ToolchainInfo tools = ValidateToolchain(toolchain, validation);
        List<string> cSources = ResolveSources(request, "generatedCSources", "generatedCPath", ".c", validation);
        List<string> auxiliaryCSources = ResolveSources(request, "cTestSources", "cTestSourcePath", ".c", validation);
        for (int auxiliaryIndex = 0; auxiliaryIndex < auxiliaryCSources.Count; auxiliaryIndex++)
            if (!ContainsPath(cSources, auxiliaryCSources[auxiliaryIndex])) cSources.Add(auxiliaryCSources[auxiliaryIndex]);
        List<string> suppliedCppSources = ResolveSources(request, "testSources", "testSourcePath", ".cpp", validation);
        ValidateAdapterInput(request, validation);

        if (contract == null)
        {
            validation.Errors.Add(Issue("contract", "contract_missing", "A test contract is required before building."));
        }
        else
        {
            Dictionary<string, object> contractData = contract;
            if (String.IsNullOrWhiteSpace(componentPath)) componentPath = NormalizePath(AscetTestContracts.GetString(contractData, "componentPath"));
        }

        if (cSources.Count == 0)
        {
            validation.Errors.Add(Issue("generatedCSources", "c_sources_missing", "At least one ASCET generated .c source is required."));
        }

        if (!validation.IsValid)
        {
            data["ready"] = false;
            string resultPath = TryWriteBuildResult(request, runId, data);
            data["buildResultPath"] = resultPath;
            return AscetTestEnvelope.Blocked(
                "build",
                runId,
                data,
                FirstIssueCode(validation.Errors, "build_preflight_failed"),
                "Build preflight failed.",
                validation.Errors,
                validation.Warnings,
                Diagnostics(false, false));
        }

        try
        {
            Directory.CreateDirectory(runDirectory);
            string googleTestDirectory = Path.Combine(runDirectory, "google-test");
            string generatedDirectory = Path.Combine(googleTestDirectory, "generated-c");
            string testsDirectory = Path.Combine(googleTestDirectory, "tests");
            string objectsDirectory = Path.Combine(googleTestDirectory, "objects");
            Directory.CreateDirectory(generatedDirectory);
            Directory.CreateDirectory(testsDirectory);
            Directory.CreateDirectory(objectsDirectory);

            string adapterPath = Path.Combine(testsDirectory, "ascet_test_adapter.cpp");
            string testPath = Path.Combine(testsDirectory, SafeId(runId) + "_gtest.cpp");
            string mainPath = Path.Combine(testsDirectory, "ascet_test_main.cpp");
            AscetTestContracts.WriteText(adapterPath, ResolveAdapterSource(request));
            AscetTestContracts.WriteText(testPath, RenderGoogleTestSource(contract));
            AscetTestContracts.WriteText(mainPath, RenderGoogleTestMain());

            List<object> cCommands = new List<object>();
            List<object> cppCommands = new List<object>();
            List<string> objectFiles = new List<string>();
            bool cCompilePassed = true;
            bool cppCompilePassed = true;
            bool linkPassed = false;

            for (int index = 0; index < cSources.Count; index++)
            {
                string source = cSources[index];
                string objectPath = Path.Combine(objectsDirectory, SafeId(Path.GetFileNameWithoutExtension(source)) + "_" + index.ToString() + ".o");
                List<string> arguments = BuildCCompileArguments(request, source, objectPath, googleTestDirectory);
                CommandResult command = RunCommand(tools.CCompiler, arguments, googleTestDirectory);
                Dictionary<string, object> record = CommandRecord("c", tools.CCompiler, source, objectPath, arguments, command);
                cCommands.Add(record);
                objectFiles.Add(objectPath);
                if (command.ExitCode != 0)
                {
                    cCompilePassed = false;
                    break;
                }
            }

            List<string> cppSources = new List<string>(suppliedCppSources);
            cppSources.Add(adapterPath);
            cppSources.Add(testPath);
            cppSources.Add(mainPath);
            string gtestSource = ResolveGoogleTestSource(tools.GoogleTestRoot);
            if (!String.IsNullOrWhiteSpace(gtestSource)) cppSources.Add(gtestSource);

            if (cCompilePassed)
            {
                for (int index = 0; index < cppSources.Count; index++)
                {
                    string source = cppSources[index];
                    string objectPath = Path.Combine(objectsDirectory, SafeId(Path.GetFileNameWithoutExtension(source)) + "_cpp_" + index.ToString() + ".o");
                    List<string> arguments = BuildCppCompileArguments(request, source, objectPath, tools.IncludeRoot, googleTestDirectory);
                    CommandResult command = RunCommand(tools.CppCompiler, arguments, googleTestDirectory);
                    Dictionary<string, object> record = CommandRecord("cpp", tools.CppCompiler, source, objectPath, arguments, command);
                    cppCommands.Add(record);
                    objectFiles.Add(objectPath);
                    if (command.ExitCode != 0)
                    {
                        cppCompilePassed = false;
                        break;
                    }
                }
            }

            string binaryPath = Path.Combine(googleTestDirectory, SafeId(runId) + ".exe");
            Dictionary<string, object> linkRecord = null;
            if (cCompilePassed && cppCompilePassed)
            {
                List<string> linkArguments = BuildLinkArguments(request, objectFiles, binaryPath, tools);
                CommandResult command = RunCommand(tools.Linker, linkArguments, googleTestDirectory);
                linkRecord = CommandRecord("link", tools.Linker, String.Empty, binaryPath, linkArguments, command);
                linkPassed = command.ExitCode == 0;
            }

            List<object> allCommands = new List<object>();
            for (int index = 0; index < cCommands.Count; index++) allCommands.Add(cCommands[index]);
            for (int index = 0; index < cppCommands.Count; index++) allCommands.Add(cppCommands[index]);
            if (linkRecord != null) allCommands.Add(linkRecord);
            string compileCommandsPath = Path.Combine(googleTestDirectory, "compile_commands.json");
            AscetTestContracts.WriteText(compileCommandsPath, AscetTestContracts.SerializeList(allCommands));

            data["googleTestDirectory"] = googleTestDirectory;
            data["cSources"] = ToObjectList(cSources);
            data["cppSources"] = ToObjectList(cppSources);
            data["compileCommands"] = allCommands;
            data["toolchain"] = tools.ToDictionary();
            data["artifacts"] = new Dictionary<string, object>
            {
                { "adapterSource", adapterPath },
                { "testSource", testPath },
                { "mainSource", mainPath },
                { "compileCommands", compileCommandsPath },
                { "binary", binaryPath }
            };
            data["stages"] = new Dictionary<string, object>
            {
                { "cCompile", cCompilePassed },
                { "cppCompile", cppCompilePassed },
                { "link", linkPassed }
            };
            data["ready"] = cCompilePassed && cppCompilePassed && linkPassed;
            string buildResultPath = TryWriteBuildResult(request, runId, data);
            data["buildResultPath"] = buildResultPath;

            if (!cCompilePassed)
            {
                return BuildBlocked(runId, data, "c_compile_failed", "ASCET C source compilation failed.", validation.Warnings);
            }
            if (!cppCompilePassed)
            {
                return BuildBlocked(runId, data, "cpp_compile_failed", "GoogleTest C++ source compilation failed.", validation.Warnings);
            }
            if (!linkPassed)
            {
                return BuildBlocked(runId, data, "link_failed", "GoogleTest link failed.", validation.Warnings);
            }

            return AscetTestEnvelope.Success(
                "build",
                runId,
                "built",
                data,
                validation.Warnings,
                Diagnostics(false, false));
        }
        catch (Exception ex)
        {
            validation.Errors.Add(Issue("build", "build_failed", ex.Message));
            data["ready"] = false;
            string resultPath = TryWriteBuildResult(request, runId, data);
            data["buildResultPath"] = resultPath;
            return BuildBlocked(runId, data, "build_failed", "Build execution failed.", validation.Warnings, validation.Errors);
        }
    }

    private static Dictionary<string, object> BuildBlocked(
        string runId,
        Dictionary<string, object> data,
        string code,
        string message,
        IList<AscetTestValidationIssue> warnings)
    {
        return BuildBlocked(runId, data, code, message, warnings, new List<AscetTestValidationIssue>());
    }

    private static Dictionary<string, object> BuildBlocked(
        string runId,
        Dictionary<string, object> data,
        string code,
        string message,
        IList<AscetTestValidationIssue> warnings,
        IList<AscetTestValidationIssue> errors)
    {
        return AscetTestEnvelope.Blocked("build", runId, data, code, message, errors, warnings, Diagnostics(false, false));
    }

    private static Dictionary<string, object> Diagnostics(bool liveExecutionStarted, bool liveWritePerformed)
    {
        return new Dictionary<string, object>
        {
            { "liveExecutionStarted", liveExecutionStarted },
            { "liveWritePerformed", liveWritePerformed },
            { "schedulerRequired", false },
            { "cCompilerOwnsC", true },
            { "cppCompilerOwnsCpp", true },
            { "linkerIsCppCompiler", true }
        };
    }

    private static Dictionary<string, object> ResolveContract(Dictionary<string, object> request)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "contract");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "testContractPath");
        if (String.IsNullOrWhiteSpace(path)) path = AscetTestContracts.GetString(request, "contractPath");
        if (String.IsNullOrWhiteSpace(path)) return null;
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        if (!File.Exists(resolved))
        {
            return new Dictionary<string, object>
            {
                { "_loadError", "testContractPath not found: " + resolved }
            };
        }
        Dictionary<string, object> loaded = AscetTestContracts.ReadObject(resolved, "testContract");
        Dictionary<string, object> generated = AscetTestContracts.GetDictionary(loaded, "generated");
        if (generated != null)
        {
            Dictionary<string, object> nested = AscetTestContracts.GetDictionary(generated, "contract");
            if (nested != null) return nested;
        }
        return loaded;
    }

    private static ToolchainInfo ValidateToolchain(Dictionary<string, object> source, AscetTestValidationResult validation)
    {
        ToolchainInfo result = new ToolchainInfo();
        result.CCompiler = FirstNonEmpty(AscetTestContracts.GetString(source, "gccPath"), AscetTestContracts.GetString(source, "cCompiler"), "gcc");
        result.CppCompiler = FirstNonEmpty(AscetTestContracts.GetString(source, "gxxPath"), AscetTestContracts.GetString(source, "cppCompiler"), "g++");
        result.Linker = FirstNonEmpty(AscetTestContracts.GetString(source, "linkerPath"), result.CppCompiler);
        result.GoogleTestRoot = AscetTestContracts.GetString(source, "googleTestRoot");

        ValidateExecutable(result.CCompiler, "toolchain.gccPath", validation);
        ValidateExecutable(result.CppCompiler, "toolchain.gxxPath", validation);
        ValidateExecutable(result.Linker, "toolchain.linkerPath", validation);
        if (String.IsNullOrWhiteSpace(result.GoogleTestRoot))
        {
            validation.Errors.Add(Issue("toolchain.googleTestRoot", "toolchain_missing", "toolchain.googleTestRoot is required."));
        }
        else if (!Directory.Exists(AscetTestContracts.ResolvePath(result.GoogleTestRoot, Directory.GetCurrentDirectory())))
        {
            validation.Errors.Add(Issue("toolchain.googleTestRoot", "toolchain_missing", "GoogleTest root was not found: " + result.GoogleTestRoot));
        }
        else
        {
            result.GoogleTestRoot = AscetTestContracts.ResolvePath(result.GoogleTestRoot, Directory.GetCurrentDirectory());
            result.IncludeRoot = ResolveGoogleTestInclude(result.GoogleTestRoot);
            if (String.IsNullOrWhiteSpace(result.IncludeRoot))
                validation.Errors.Add(Issue("toolchain.googleTestRoot", "google_test_missing", "GoogleTest include directory was not found under googleTestRoot."));
            result.LibraryPaths = ResolveGoogleTestLibraries(source, result.GoogleTestRoot);
            result.GoogleTestSource = ResolveGoogleTestSource(result.GoogleTestRoot);
            if (result.LibraryPaths.Count == 0 && String.IsNullOrWhiteSpace(result.GoogleTestSource))
                validation.Errors.Add(Issue("toolchain.googleTestRoot", "google_test_missing", "GoogleTest library or gtest-all.cc source was not found."));
        }
        return result;
    }

    private static void ValidateExecutable(string value, string path, AscetTestValidationResult validation)
    {
        if (String.IsNullOrWhiteSpace(value)) return;
        bool explicitPath = Path.IsPathRooted(value) || value.IndexOf(Path.DirectorySeparatorChar) >= 0 || value.IndexOf(Path.AltDirectorySeparatorChar) >= 0;
        if (explicitPath && !File.Exists(AscetTestContracts.ResolvePath(value, Directory.GetCurrentDirectory())))
            validation.Errors.Add(Issue(path, "toolchain_missing", "Compiler executable was not found: " + value));
    }

    private static List<string> ResolveSources(Dictionary<string, object> request, string listKey, string directoryKey, string extension, AscetTestValidationResult validation)
    {
        List<string> result = new List<string>();
        object raw = AscetTestContracts.GetValue(request, listKey);
        IList list = raw as IList;
        if (list != null)
        {
            for (int index = 0; index < list.Count; index++)
            {
                string value = Convert.ToString(list[index]) ?? String.Empty;
                if (String.IsNullOrWhiteSpace(value)) continue;
                string resolved = AscetTestContracts.ResolvePath(value, Directory.GetCurrentDirectory());
                if (!File.Exists(resolved)) validation.Errors.Add(Issue(listKey + "[" + index.ToString() + "]", "source_missing", "Source was not found: " + value));
                else if (!String.Equals(Path.GetExtension(resolved), extension, StringComparison.OrdinalIgnoreCase)) validation.Errors.Add(Issue(listKey + "[" + index.ToString() + "]", "source_language_mismatch", "Expected a " + extension + " source: " + value));
                else result.Add(resolved);
            }
        }
        string directory = AscetTestContracts.GetString(request, directoryKey);
        if (!String.IsNullOrWhiteSpace(directory))
        {
            string resolvedDirectory = AscetTestContracts.ResolvePath(directory, Directory.GetCurrentDirectory());
            if (!Directory.Exists(resolvedDirectory)) validation.Errors.Add(Issue(directoryKey, "source_missing", "Source directory was not found: " + directory));
            else
            {
                string[] files = Directory.GetFiles(resolvedDirectory, "*" + extension, SearchOption.AllDirectories);
                for (int index = 0; index < files.Length; index++) if (!ContainsPath(result, files[index])) result.Add(files[index]);
            }
        }
        return result;
    }

    private static void ValidateAdapterInput(Dictionary<string, object> request, AscetTestValidationResult validation)
    {
        string source = AscetTestContracts.GetString(request, "adapterSource");
        string path = AscetTestContracts.GetString(request, "adapterSourcePath");
        if (String.IsNullOrWhiteSpace(source) && String.IsNullOrWhiteSpace(path))
        {
            validation.Errors.Add(Issue("adapterSource", "adapter_contract_missing", "Agent-generated C++ adapter source is required."));
        }
        else if (!String.IsNullOrWhiteSpace(path) && !File.Exists(AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory())))
        {
            validation.Errors.Add(Issue("adapterSourcePath", "source_missing", "Adapter source was not found: " + path));
        }
    }

    private static string ResolveAdapterSource(Dictionary<string, object> request)
    {
        string source = AscetTestContracts.GetString(request, "adapterSource");
        if (!String.IsNullOrWhiteSpace(source)) return source;
        string path = AscetTestContracts.ResolvePath(AscetTestContracts.GetString(request, "adapterSourcePath"), Directory.GetCurrentDirectory());
        return File.ReadAllText(path, Encoding.UTF8);
    }

    private static List<string> BuildCCompileArguments(Dictionary<string, object> request, string source, string objectPath, string googleTestDirectory)
    {
        List<string> result = GetFlags(request, "cFlags", new[] { "-m32", "-O0", "-g", "-std=gnu89" });
        result.Add("-c");
        result.Add(source);
        result.Add("-o");
        result.Add(objectPath);
        return result;
    }

    private static List<string> BuildCppCompileArguments(Dictionary<string, object> request, string source, string objectPath, string includeRoot, string googleTestDirectory)
    {
        List<string> result = GetFlags(request, "cppFlags", new[] { "-m32", "-O0", "-g", "-std=gnu++11" });
        if (!String.IsNullOrWhiteSpace(includeRoot)) { result.Add("-I"); result.Add(includeRoot); }
        if (String.Equals(Path.GetFileName(source), "gtest-all.cc", StringComparison.OrdinalIgnoreCase))
        {
            string sourceRoot = Path.GetDirectoryName(Path.GetDirectoryName(source));
            if (!String.IsNullOrWhiteSpace(sourceRoot)) { result.Add("-I"); result.Add(sourceRoot); }
        }
        result.Add("-c");
        result.Add(source);
        result.Add("-o");
        result.Add(objectPath);
        return result;
    }

    private static List<string> BuildLinkArguments(Dictionary<string, object> request, List<string> objectFiles, string binaryPath, ToolchainInfo tools)
    {
        List<string> result = new List<string>();
        // The link must use the same target architecture and C++ ABI as the
        // C++ compilation.  In particular, `-m32` is not inherited from the
        // compile commands by gcc/g++, so omitting it makes the linker produce
        // an x64 output and reject the i386 objects.  Allow an explicit
        // linkFlags override, otherwise reuse the C++ flags (which are safe at
        // link time for the supported toolchains).
        List<string> linkFlags = GetLinkFlags(request);
        for (int index = 0; index < linkFlags.Count; index++) result.Add(linkFlags[index]);
        for (int index = 0; index < objectFiles.Count; index++) result.Add(objectFiles[index]);
        for (int index = 0; index < tools.LibraryPaths.Count; index++) result.Add(tools.LibraryPaths[index]);
        result.Add("-o");
        result.Add(binaryPath);
        return result;
    }

    private static List<string> GetLinkFlags(Dictionary<string, object> request)
    {
        object rawLinkFlags = AscetTestContracts.GetValue(request, "linkFlags");
        IList linkValues = rawLinkFlags as IList;
        if (linkValues != null && linkValues.Count > 0)
        {
            List<string> explicitFlags = new List<string>();
            for (int index = 0; index < linkValues.Count; index++) explicitFlags.Add(Convert.ToString(linkValues[index]) ?? String.Empty);
            return explicitFlags;
        }

        List<string> cppFlags = GetFlags(request, "cppFlags", new[] { "-m32", "-O0", "-g", "-std=gnu++11" });
        List<string> result = new List<string>();
        for (int index = 0; index < cppFlags.Count; index++)
        {
            string flag = cppFlags[index];
            if (String.Equals(flag, "-c", StringComparison.OrdinalIgnoreCase)) continue;
            result.Add(flag);
        }
        return result;
    }

    private static List<string> GetFlags(Dictionary<string, object> request, string key, string[] defaults)
    {
        List<string> result = new List<string>();
        object raw = AscetTestContracts.GetValue(request, key);
        IList list = raw as IList;
        if (list == null || list.Count == 0)
        {
            for (int index = 0; index < defaults.Length; index++) result.Add(defaults[index]);
            return result;
        }
        for (int index = 0; index < list.Count; index++) result.Add(Convert.ToString(list[index]) ?? String.Empty);
        return result;
    }

    private static Dictionary<string, object> CommandRecord(string language, string compiler, string source, string output, List<string> arguments, CommandResult result)
    {
        List<object> argumentValues = new List<object>();
        for (int index = 0; index < arguments.Count; index++) argumentValues.Add(arguments[index]);
        return new Dictionary<string, object>
        {
            { "language", language },
            { "compiler", compiler },
            { "source", source },
            { "output", output },
            { "arguments", argumentValues },
            { "command", Quote(compiler) + " " + JoinArguments(arguments) },
            { "exitCode", result.ExitCode },
            { "stdout", result.Stdout },
            { "stderr", result.Stderr },
            { "durationMs", result.DurationMs }
        };
    }

    private static CommandResult RunCommand(string executable, List<string> arguments, string workingDirectory)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = executable,
            Arguments = JoinArguments(arguments),
            WorkingDirectory = ResolveCommandWorkingDirectory(executable, workingDirectory),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        Stopwatch stopwatch = Stopwatch.StartNew();
        try
        {
            using (Process process = new Process { StartInfo = startInfo })
            {
                process.Start();
                Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
                Task<string> stderrTask = process.StandardError.ReadToEndAsync();
                process.WaitForExit();
                Task.WaitAll(stdoutTask, stderrTask);
                stopwatch.Stop();
                return new CommandResult { ExitCode = process.ExitCode, Stdout = stdoutTask.Result, Stderr = stderrTask.Result, DurationMs = stopwatch.ElapsedMilliseconds };
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new CommandResult { ExitCode = -1, Stdout = String.Empty, Stderr = ex.Message, DurationMs = stopwatch.ElapsedMilliseconds };
        }
    }

    private static string ResolveCommandWorkingDirectory(string executable, string fallback)
    {
        if (!String.IsNullOrWhiteSpace(executable) && Path.IsPathRooted(executable))
        {
            string directory = Path.GetDirectoryName(Path.GetFullPath(executable));
            if (!String.IsNullOrWhiteSpace(directory) && Directory.Exists(directory)) return directory;
        }

        return fallback;
    }

    private static string ResolveGoogleTestInclude(string root)
    {
        string[] candidates =
        {
            Path.Combine(root, "include"),
            root,
            Path.Combine(root, "googletest", "include")
        };
        for (int index = 0; index < candidates.Length; index++)
            if (File.Exists(Path.Combine(candidates[index], "gtest", "gtest.h"))) return candidates[index];
        return String.Empty;
    }

    private static List<string> ResolveGoogleTestLibraries(Dictionary<string, object> source, string root)
    {
        List<string> result = new List<string>();
        object raw = AscetTestContracts.GetValue(source, "googleTestLibraries");
        IList list = raw as IList;
        if (list != null)
        {
            for (int index = 0; index < list.Count; index++)
            {
                string path = AscetTestContracts.ResolvePath(Convert.ToString(list[index]), Directory.GetCurrentDirectory());
                if (File.Exists(path)) result.Add(path);
            }
        }
        if (result.Count > 0) return result;
        string[] candidates =
        {
            Path.Combine(root, "lib", "libgtest.a"),
            Path.Combine(root, "lib", "gtest.lib"),
            Path.Combine(root, "lib64", "libgtest.a"),
            Path.Combine(root, "lib64", "gtest.lib"),
            Path.Combine(root, "lib", "libgtest.dll.a")
        };
        for (int index = 0; index < candidates.Length; index++) if (File.Exists(candidates[index])) result.Add(candidates[index]);
        return result;
    }

    private static string ResolveGoogleTestSource(string root)
    {
        if (String.IsNullOrWhiteSpace(root)) return String.Empty;
        string[] candidates =
        {
            Path.Combine(root, "src", "gtest-all.cc"),
            Path.Combine(root, "googletest", "src", "gtest-all.cc")
        };
        for (int index = 0; index < candidates.Length; index++) if (File.Exists(candidates[index])) return candidates[index];
        return String.Empty;
    }

    private static string RenderGoogleTestSource(Dictionary<string, object> contract)
    {
        StringBuilder builder = new StringBuilder();
        builder.AppendLine("#include <gtest/gtest.h>");
        builder.AppendLine("extern \"C\" int ascet_test_run_case(const char*, const char*);");
        IList suites = AscetTestContracts.GetValue(contract, "suites") as IList;
        if (suites != null)
        {
            for (int suiteIndex = 0; suiteIndex < suites.Count; suiteIndex++)
            {
                IDictionary<string, object> suite = suites[suiteIndex] as IDictionary<string, object>;
                if (suite == null) continue;
                string suiteId = AscetTestContracts.GetString(suite, "id");
                IList cases = AscetTestContracts.GetValue(suite, "cases") as IList;
                if (cases == null) continue;
                for (int caseIndex = 0; caseIndex < cases.Count; caseIndex++)
                {
                    IDictionary<string, object> testCase = cases[caseIndex] as IDictionary<string, object>;
                    if (testCase == null) continue;
                    string caseId = AscetTestContracts.GetString(testCase, "id");
                    builder.Append("TEST(").Append(SafeCppId(suiteId)).Append(", ").Append(SafeCppId(caseId)).AppendLine(") {" );
                    builder.Append("  ASSERT_EQ(0, ascet_test_run_case(\"").Append(EscapeCpp(suiteId)).Append("\", \"").Append(EscapeCpp(caseId)).AppendLine("\"));");
                    builder.AppendLine("}");
                }
            }
        }
        return builder.ToString();
    }

    private static string RenderGoogleTestMain()
    {
        return "#include <gtest/gtest.h>\nint main(int argc, char** argv) { testing::InitGoogleTest(&argc, argv); return RUN_ALL_TESTS(); }\n";
    }

    private static string EscapeCpp(string value)
    {
        return (value ?? String.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private static string SafeCppId(string value)
    {
        string result = SafeId(value);
        if (String.IsNullOrWhiteSpace(result)) result = "GeneratedTest";
        if (Char.IsDigit(result[0])) result = "T_" + result;
        return result;
    }

    private static string SafeId(string value)
    {
        if (String.IsNullOrWhiteSpace(value)) return "generated";
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < value.Length; index++)
        {
            char current = value[index];
            builder.Append(Char.IsLetterOrDigit(current) || current == '_' ? current : '_');
        }
        string result = builder.ToString().Trim('_');
        return String.IsNullOrWhiteSpace(result) ? "generated" : result;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        for (int index = 0; index < values.Length; index++) if (!String.IsNullOrWhiteSpace(values[index])) return values[index];
        return String.Empty;
    }

    private static List<object> ToObjectList(List<string> values)
    {
        List<object> result = new List<object>();
        for (int index = 0; index < values.Count; index++) result.Add(values[index]);
        return result;
    }

    private static bool ContainsPath(List<string> values, string value)
    {
        for (int index = 0; index < values.Count; index++)
            if (String.Equals(values[index], value, StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static string TryWriteBuildResult(Dictionary<string, object> request, string runId, Dictionary<string, object> data)
    {
        try { return AscetTestArtifactWriter.WriteJson(request, runId, "build-result.json", data); }
        catch { return String.Empty; }
    }

    private static string JoinArguments(List<string> arguments)
    {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < arguments.Count; index++)
        {
            if (index > 0) builder.Append(' ');
            builder.Append(Quote(arguments[index]));
        }
        return builder.ToString();
    }

    private static string Quote(string value)
    {
        string text = value ?? String.Empty;
        if (text.Length == 0) return "\"\"";
        if (text.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return text;
        return "\"" + text.Replace("\"", "\\\"") + "\"";
    }

    private static string NormalizePath(string value) { return (value ?? String.Empty).Trim().Replace('\\', '/'); }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
    private static string FirstIssueCode(IList<AscetTestValidationIssue> issues, string fallback) { return issues == null || issues.Count == 0 || String.IsNullOrWhiteSpace(issues[0].Code) ? fallback : issues[0].Code; }

    private sealed class CommandResult
    {
        public int ExitCode;
        public string Stdout;
        public string Stderr;
        public long DurationMs;
    }

    private sealed class ToolchainInfo
    {
        public string CCompiler = String.Empty;
        public string CppCompiler = String.Empty;
        public string Linker = String.Empty;
        public string GoogleTestRoot = String.Empty;
        public string IncludeRoot = String.Empty;
        public string GoogleTestSource = String.Empty;
        public List<string> LibraryPaths = new List<string>();

        public Dictionary<string, object> ToDictionary()
        {
            List<object> libraries = new List<object>();
            for (int index = 0; index < LibraryPaths.Count; index++) libraries.Add(LibraryPaths[index]);
            return new Dictionary<string, object>
            {
                { "cCompiler", CCompiler },
                { "cppCompiler", CppCompiler },
                { "linker", Linker },
                { "googleTestRoot", GoogleTestRoot },
                { "includeRoot", IncludeRoot },
                { "googleTestSource", GoogleTestSource },
                { "googleTestLibraries", libraries }
            };
        }
    }
}
