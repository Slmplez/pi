using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Web.Script.Serialization;
using de.etas.cebra.toolAPI.Ascet;
using SysProcess = System.Diagnostics.Process;
using SysProcessStartInfo = System.Diagnostics.ProcessStartInfo;

public sealed class AscetApartmentScenarioResult
{
    public string ScenarioName { get; set; }
    public string ApartmentModel { get; set; }
    public string SessionModel { get; set; }
    public int WorkerCount { get; set; }
    public int IterationsPerWorker { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int CompletedWorkers { get; set; }
    public bool TimedOut { get; set; }
    public long ElapsedMilliseconds { get; set; }
    public double AverageOperationMilliseconds { get; set; }
    public double ThroughputOpsPerSecond { get; set; }
    public string FirstError { get; set; }
    public string Notes { get; set; }
}

public sealed class AscetApartmentScenarioConfig
{
    public string ScenarioName { get; set; }
    public ApartmentState ApartmentModel { get; set; }
    public bool SharedSession { get; set; }
    public int WorkerCount { get; set; }
    public int IterationsPerWorker { get; set; }
    public int ScenarioTimeoutMs { get; set; }
}

public static class AscetApartmentModelTest
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
    private static readonly string[] ScenarioNames = new string[]
    {
        "sta-isolated",
        "mta-isolated",
        "sta-shared",
        "mta-shared"
    };

    public static int Main(string[] args)
    {
        try
        {
            AscetConcurrencySupport.ConfigureAssemblyResolution();

            if (args != null && args.Length >= 2 && String.Equals(args[0], "--scenario", StringComparison.OrdinalIgnoreCase))
            {
                string scenarioName = args[1];
                int workerCount = args.Length >= 3 ? Int32.Parse(args[2]) : 4;
                int iterationsPerWorker = args.Length >= 4 ? Int32.Parse(args[3]) : 20;
                int timeoutMs = args.Length >= 5 ? Int32.Parse(args[4]) : 15000;

                AscetApartmentScenarioConfig config = CreateScenarioConfig(
                    scenarioName,
                    workerCount,
                    iterationsPerWorker,
                    timeoutMs);

                AscetApartmentScenarioResult scenarioResult = ExecuteScenario(config);
                Console.WriteLine(Serializer.Serialize(scenarioResult));
                return 0;
            }

            return RunOrchestrator();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    private static int RunOrchestrator()
    {
        Console.WriteLine("=== ASCET Apartment Model Experiment ===");
        Console.WriteLine("Goal: compare STA/MTA and isolated/shared session behavior.");
        Console.WriteLine();

        AscetConcurrencySupport.EnsureDatabaseOpen();

        List<AscetApartmentScenarioResult> results = new List<AscetApartmentScenarioResult>();
        foreach (string scenarioName in ScenarioNames)
        {
            AscetApartmentScenarioResult result = ExecuteScenarioInChildProcess(
                scenarioName,
                4,
                20,
                15000);

            results.Add(result);
            PrintScenarioResult(result);
        }

        PrintConclusion(results);
        return 0;
    }

    private static AscetApartmentScenarioResult ExecuteScenarioInChildProcess(
        string scenarioName,
        int workerCount,
        int iterationsPerWorker,
        int timeoutMs)
    {
        string currentExePath = SysProcess.GetCurrentProcess().MainModule.FileName;

        SysProcessStartInfo startInfo = new SysProcessStartInfo
        {
            FileName = currentExePath,
            Arguments = String.Format(
                "--scenario {0} {1} {2} {3}",
                scenarioName,
                workerCount,
                iterationsPerWorker,
                timeoutMs),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory
        };

        using (SysProcess child = new SysProcess())
        {
            child.StartInfo = startInfo;
            if (!child.Start())
            {
                throw new InvalidOperationException("Failed to start child scenario process.");
            }

            if (!child.WaitForExit(timeoutMs + 5000))
            {
                try
                {
                    child.Kill();
                }
                catch
                {
                }

                AscetApartmentScenarioConfig config = CreateScenarioConfig(
                    scenarioName,
                    workerCount,
                    iterationsPerWorker,
                    timeoutMs);

                return new AscetApartmentScenarioResult
                {
                    ScenarioName = config.ScenarioName,
                    ApartmentModel = config.ApartmentModel.ToString(),
                    SessionModel = config.SharedSession ? "shared" : "isolated",
                    WorkerCount = config.WorkerCount,
                    IterationsPerWorker = config.IterationsPerWorker,
                    TimedOut = true,
                    CompletedWorkers = 0,
                    FirstError = "Child scenario process timed out and was killed.",
                    Notes = "This usually indicates a deadlock or blocked COM call."
                };
            }

            string stdout = child.StandardOutput.ReadToEnd();
            string stderr = child.StandardError.ReadToEnd();

            if (child.ExitCode != 0)
            {
                throw new InvalidOperationException(
                    "Scenario process failed: " + scenarioName + Environment.NewLine +
                    "STDERR:" + Environment.NewLine + stderr + Environment.NewLine +
                    "STDOUT:" + Environment.NewLine + stdout);
            }

            string json = ExtractJson(stdout);
            if (String.IsNullOrWhiteSpace(json))
            {
                throw new InvalidOperationException(
                    "Scenario process produced no JSON output: " + scenarioName + Environment.NewLine + stdout);
            }

            return Serializer.Deserialize<AscetApartmentScenarioResult>(json);
        }
    }

    private static string ExtractJson(string stdout)
    {
        if (String.IsNullOrWhiteSpace(stdout))
        {
            return String.Empty;
        }

        string[] lines = stdout
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);

        for (int i = lines.Length - 1; i >= 0; i--)
        {
            string line = lines[i].Trim();
            if (line.StartsWith("{", StringComparison.Ordinal) &&
                line.EndsWith("}", StringComparison.Ordinal))
            {
                return line;
            }
        }

        return String.Empty;
    }

    private static AscetApartmentScenarioConfig CreateScenarioConfig(
        string scenarioName,
        int workerCount,
        int iterationsPerWorker,
        int timeoutMs)
    {
        bool isSta = scenarioName.IndexOf("sta", StringComparison.OrdinalIgnoreCase) >= 0;
        bool shared = scenarioName.IndexOf("shared", StringComparison.OrdinalIgnoreCase) >= 0;

        return new AscetApartmentScenarioConfig
        {
            ScenarioName = scenarioName,
            ApartmentModel = isSta ? ApartmentState.STA : ApartmentState.MTA,
            SharedSession = shared,
            WorkerCount = workerCount,
            IterationsPerWorker = iterationsPerWorker,
            ScenarioTimeoutMs = timeoutMs
        };
    }

    private static AscetApartmentScenarioResult ExecuteScenario(AscetApartmentScenarioConfig config)
    {
        return config.SharedSession
            ? ExecuteSharedScenario(config)
            : ExecuteIsolatedScenario(config);
    }

    private static AscetApartmentScenarioResult ExecuteIsolatedScenario(
        AscetApartmentScenarioConfig config)
    {
        int successCount = 0;
        int failureCount = 0;
        int completedWorkers = 0;
        long totalOperationMilliseconds = 0;
        string firstError = null;
        object gate = new object();

        Stopwatch stopwatch = Stopwatch.StartNew();
        List<Thread> workers = new List<Thread>();

        for (int i = 0; i < config.WorkerCount; i++)
        {
            Thread worker = new Thread(delegate()
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();
                    if (database == null)
                    {
                        throw new InvalidOperationException("GetCurrentDataBase returned null.");
                    }

                    for (int iteration = 0; iteration < config.IterationsPerWorker; iteration++)
                    {
                        Stopwatch opWatch = Stopwatch.StartNew();
                        string databaseName = database.GetName();
                        AscetFolder[] folders = database.GetAllAscetFolders();
                        opWatch.Stop();

                        if (String.IsNullOrWhiteSpace(databaseName))
                        {
                            throw new InvalidOperationException("Database name was empty.");
                        }

                        int folderCount = folders == null ? 0 : folders.Length;
                        if (folderCount < 0)
                        {
                            throw new InvalidOperationException("Folder count was invalid.");
                        }

                        lock (gate)
                        {
                            successCount++;
                            totalOperationMilliseconds += opWatch.ElapsedMilliseconds;
                        }
                    }
                }
                catch (Exception ex)
                {
                    lock (gate)
                    {
                        failureCount += config.IterationsPerWorker;
                        if (String.IsNullOrEmpty(firstError))
                        {
                            firstError = ex.GetType().Name + ": " + ex.Message;
                        }
                    }
                }
                finally
                {
                    lock (gate)
                    {
                        completedWorkers++;
                    }
                }
            });

            worker.IsBackground = true;
            worker.SetApartmentState(config.ApartmentModel);
            workers.Add(worker);
            worker.Start();
        }

        bool timedOut = !WaitForWorkers(config.ScenarioTimeoutMs, config.WorkerCount, delegate()
        {
            lock (gate)
            {
                return completedWorkers;
            }
        });

        stopwatch.Stop();
        return BuildScenarioResult(
            config,
            successCount,
            failureCount,
            completedWorkers,
            timedOut,
            totalOperationMilliseconds,
            stopwatch.ElapsedMilliseconds,
            firstError,
            timedOut
                ? "Worker threads did not all finish before timeout."
                : "Each worker used its own Ascet/DataBase session.");
    }

    private static AscetApartmentScenarioResult ExecuteSharedScenario(
        AscetApartmentScenarioConfig config)
    {
        int successCount = 0;
        int failureCount = 0;
        int completedWorkers = 0;
        long totalOperationMilliseconds = 0;
        string firstError = null;
        object gate = new object();

        Ascet sharedTool = null;
        AscetDataBase sharedDatabase = null;
        Exception ownerError = null;

        ManualResetEventSlim ownerReady = new ManualResetEventSlim(false);
        ManualResetEventSlim releaseOwner = new ManualResetEventSlim(false);

        Thread ownerThread = new Thread(delegate()
        {
            try
            {
                sharedTool = new Ascet();
                sharedDatabase = sharedTool.GetCurrentDataBase();
                if (sharedDatabase == null)
                {
                    throw new InvalidOperationException("Shared GetCurrentDataBase returned null.");
                }
            }
            catch (Exception ex)
            {
                ownerError = ex;
            }
            finally
            {
                ownerReady.Set();
            }

            releaseOwner.Wait(config.ScenarioTimeoutMs);
        });

        ownerThread.IsBackground = true;
        ownerThread.SetApartmentState(config.ApartmentModel);
        ownerThread.Start();

        if (!ownerReady.Wait(5000))
        {
            return BuildScenarioResult(
                config,
                0,
                config.WorkerCount * config.IterationsPerWorker,
                0,
                true,
                0,
                0,
                "Owner thread did not initialize in time.",
                "Shared session owner failed to initialize.");
        }

        if (ownerError != null)
        {
            return BuildScenarioResult(
                config,
                0,
                config.WorkerCount * config.IterationsPerWorker,
                0,
                false,
                0,
                0,
                ownerError.GetType().Name + ": " + ownerError.Message,
                "Shared session owner could not create shared ToolAPI handles.");
        }

        Stopwatch stopwatch = Stopwatch.StartNew();
        List<Thread> workers = new List<Thread>();

        for (int i = 0; i < config.WorkerCount; i++)
        {
            Thread worker = new Thread(delegate()
            {
                try
                {
                    if (sharedDatabase == null)
                    {
                        throw new InvalidOperationException("Shared database handle was null.");
                    }

                    for (int iteration = 0; iteration < config.IterationsPerWorker; iteration++)
                    {
                        Stopwatch opWatch = Stopwatch.StartNew();
                        string databaseName = sharedDatabase.GetName();
                        AscetFolder[] folders = sharedDatabase.GetAllAscetFolders();
                        opWatch.Stop();

                        if (String.IsNullOrWhiteSpace(databaseName))
                        {
                            throw new InvalidOperationException("Shared database name was empty.");
                        }

                        int folderCount = folders == null ? 0 : folders.Length;
                        if (folderCount < 0)
                        {
                            throw new InvalidOperationException("Shared folder count was invalid.");
                        }

                        lock (gate)
                        {
                            successCount++;
                            totalOperationMilliseconds += opWatch.ElapsedMilliseconds;
                        }
                    }
                }
                catch (Exception ex)
                {
                    lock (gate)
                    {
                        failureCount += config.IterationsPerWorker;
                        if (String.IsNullOrEmpty(firstError))
                        {
                            firstError = ex.GetType().Name + ": " + ex.Message;
                        }
                    }
                }
                finally
                {
                    lock (gate)
                    {
                        completedWorkers++;
                    }
                }
            });

            worker.IsBackground = true;
            worker.SetApartmentState(config.ApartmentModel);
            workers.Add(worker);
            worker.Start();
        }

        bool timedOut = !WaitForWorkers(config.ScenarioTimeoutMs, config.WorkerCount, delegate()
        {
            lock (gate)
            {
                return completedWorkers;
            }
        });

        stopwatch.Stop();
        releaseOwner.Set();

        return BuildScenarioResult(
            config,
            successCount,
            failureCount,
            completedWorkers,
            timedOut,
            totalOperationMilliseconds,
            stopwatch.ElapsedMilliseconds,
            firstError,
            timedOut
                ? "Shared handle access timed out; likely blocked or deadlocked."
                : "All workers shared a single Ascet/DataBase handle.");
    }

    private static bool WaitForWorkers(
        int timeoutMs,
        int expectedWorkerCount,
        Func<int> completedWorkerCountProvider)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        while (stopwatch.ElapsedMilliseconds < timeoutMs)
        {
            if (completedWorkerCountProvider() >= expectedWorkerCount)
            {
                return true;
            }

            Thread.Sleep(25);
        }

        return completedWorkerCountProvider() >= expectedWorkerCount;
    }

    private static AscetApartmentScenarioResult BuildScenarioResult(
        AscetApartmentScenarioConfig config,
        int successCount,
        int failureCount,
        int completedWorkers,
        bool timedOut,
        long totalOperationMilliseconds,
        long elapsedMilliseconds,
        string firstError,
        string notes)
    {
        double averageOperationMilliseconds = successCount > 0
            ? totalOperationMilliseconds / (double)successCount
            : 0.0;
        double throughputOpsPerSecond = elapsedMilliseconds > 0
            ? successCount * 1000.0 / elapsedMilliseconds
            : 0.0;

        return new AscetApartmentScenarioResult
        {
            ScenarioName = config.ScenarioName,
            ApartmentModel = config.ApartmentModel.ToString(),
            SessionModel = config.SharedSession ? "shared" : "isolated",
            WorkerCount = config.WorkerCount,
            IterationsPerWorker = config.IterationsPerWorker,
            SuccessCount = successCount,
            FailureCount = failureCount,
            CompletedWorkers = completedWorkers,
            TimedOut = timedOut,
            ElapsedMilliseconds = elapsedMilliseconds,
            AverageOperationMilliseconds = averageOperationMilliseconds,
            ThroughputOpsPerSecond = throughputOpsPerSecond,
            FirstError = firstError ?? String.Empty,
            Notes = notes ?? String.Empty
        };
    }

    private static void PrintScenarioResult(AscetApartmentScenarioResult result)
    {
        Console.WriteLine(
            String.Format(
                "[{0}] apartment={1} session={2} success={3} failure={4} workersDone={5}/{6} timedOut={7} avg={8:F1}ms throughput={9:F1}/s",
                result.ScenarioName,
                result.ApartmentModel,
                result.SessionModel,
                result.SuccessCount,
                result.FailureCount,
                result.CompletedWorkers,
                result.WorkerCount,
                result.TimedOut,
                result.AverageOperationMilliseconds,
                result.ThroughputOpsPerSecond));

        if (!String.IsNullOrWhiteSpace(result.FirstError))
        {
            Console.WriteLine("  FirstError: " + result.FirstError);
        }

        if (!String.IsNullOrWhiteSpace(result.Notes))
        {
            Console.WriteLine("  Notes: " + result.Notes);
        }

        Console.WriteLine();
    }

    private static void PrintConclusion(IList<AscetApartmentScenarioResult> results)
    {
        AscetApartmentScenarioResult staIsolated = FindScenario(results, "sta-isolated");
        AscetApartmentScenarioResult mtaIsolated = FindScenario(results, "mta-isolated");
        AscetApartmentScenarioResult staShared = FindScenario(results, "sta-shared");
        AscetApartmentScenarioResult mtaShared = FindScenario(results, "mta-shared");

        Console.WriteLine("=== Conclusion ===");

        bool isolatedStable =
            IsSuccessful(staIsolated) || IsSuccessful(mtaIsolated);

        if (isolatedStable && !IsSuccessful(staShared) && !IsSuccessful(mtaShared))
        {
            Console.WriteLine(
                "Recommendation: do not share a single ToolAPI session across threads. Reuse one session per worker thread instead.");
        }
        else if (IsSuccessful(mtaShared) && !IsSuccessful(staShared))
        {
            Console.WriteLine(
                "Observation: shared-session access appears viable only under MTA in this environment.");
        }
        else if (IsSuccessful(staShared) || IsSuccessful(mtaShared))
        {
            Console.WriteLine(
                "Observation: at least one shared-session scenario completed, but compare error rates and throughput before trusting it for production.");
        }
        else
        {
            Console.WriteLine(
                "Observation: the experiment did not find a clearly safe shared-session model.");
        }

        if (IsSuccessful(staIsolated) && IsSuccessful(mtaIsolated))
        {
            Console.WriteLine(
                "Both STA and MTA can execute concurrent reads when each thread owns its own session.");
        }
        else if (IsSuccessful(mtaIsolated))
        {
            Console.WriteLine("MTA with isolated sessions succeeded more reliably than STA in this run.");
        }
        else if (IsSuccessful(staIsolated))
        {
            Console.WriteLine("STA with isolated sessions succeeded more reliably than MTA in this run.");
        }

        Console.WriteLine();
        Console.WriteLine("Raw JSON results:");
        Console.WriteLine(Serializer.Serialize(results));
    }

    private static AscetApartmentScenarioResult FindScenario(
        IList<AscetApartmentScenarioResult> results,
        string scenarioName)
    {
        return results.FirstOrDefault(
            result => String.Equals(result.ScenarioName, scenarioName, StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsSuccessful(AscetApartmentScenarioResult result)
    {
        return result != null &&
               !result.TimedOut &&
               result.FailureCount == 0 &&
               result.CompletedWorkers == result.WorkerCount;
    }
}
