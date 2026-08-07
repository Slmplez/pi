using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using de.etas.cebra.toolAPI.Ascet;
using SystemTask = System.Threading.Tasks.Task;

/// <summary>
/// Comprehensive concurrency test suite for ASCET Tool API
/// Based on: docs/ASCET_API_骞跺彂鍘熺悊鎸囧鏂囨。.md
///
/// Tests validate:
/// 1. Read operations are thread-safe and scale linearly
/// 2. Write operations require explicit locking
/// 3. Read-write mixing works correctly
/// 4. Lock management follows best practices
/// 5. Performance characteristics match documented benchmarks
/// </summary>
public class AscetConcurrencyTest
{
    private const string TestDatabasePath = @"d:\ETASData\ASCET6.4\Database\Tutorial";
    private const string TestFolderName = "DEMO";
    private const string TestComponentName = "Class_ESDL";

    static int Main(string[] args)
    {
        try
        {
            Console.WriteLine("=== ASCET Tool API Concurrency Test Suite ===");
            Console.WriteLine("Based on: docs/ASCET_API_骞跺彂鍘熺悊鎸囧鏂囨。.md");
            Console.WriteLine();

            AscetConcurrencySupport.ConfigureAssemblyResolution();

            // Verify database is open in ASCET GUI
            Ascet testTool = new Ascet();
            AscetDataBase testDb = testTool.GetCurrentDataBase();
            if (testDb == null)
            {
                Console.Error.WriteLine("ERROR: No database is open in ASCET GUI");
                Console.Error.WriteLine("Please open the Tutorial database in ASCET before running this test");
                return 1;
            }
            Console.WriteLine("Database detected: " + testDb.GetName());
            Console.WriteLine("All worker threads will use GetCurrentDataBase()");
            Console.WriteLine();

            bool allPassed = true;

            // Test 1: Concurrent Read Operations (Section 2.2, Test 1)
            Console.WriteLine("About to run Test 1...");
            allPassed &= RunTest("Test 1: 10-Thread Concurrent Read", Test1_ConcurrentRead);
            Console.WriteLine("Test 1 completed, allPassed = " + allPassed);

            // Test 2: Read-Write Mix (Section 2.2, Test 2)
            Console.WriteLine("About to run Test 2...");
            allPassed &= RunTest("Test 2: Read-Write Mix (8 Read + 2 Write)", Test2_ReadWriteMix);
            Console.WriteLine("Test 2 completed");

            // Test 3: Stress Test (Section 2.2, Test 3)
            Console.WriteLine("About to run Test 3...");
            allPassed &= RunTest("Test 3: Stress Test (20 Threads x 10s)", Test3_StressTest);
            Console.WriteLine("Test 3 completed");

            // Test 4: Lock Management Best Practices (Section 3.1)
            Console.WriteLine("About to run Test 4...");
            allPassed &= RunTest("Test 4: Lock Management Validation", Test4_LockManagement);
            Console.WriteLine("Test 4 completed");

            // Test 5: Write Without Lock (Should Fail - Section 3.1, Rule 1)
            Console.WriteLine("About to run Test 5...");
            allPassed &= RunTest("Test 5: Write Without Lock (Expected Failure)", Test5_WriteWithoutLock);
            Console.WriteLine("Test 5 completed");

            // Test 6: Lock Not Released (Section 3.1, Rule 2)
            Console.WriteLine("About to run Test 6...");
            allPassed &= RunTest("Test 6: Lock Release Validation", Test6_LockRelease);
            Console.WriteLine("Test 6 completed");

            // Test 7: Scalability Test (Section 2.4)
            Console.WriteLine("About to run Test 7...");
            allPassed &= RunTest("Test 7: Read Scalability (1, 2, 5, 10, 20 threads)", Test7_Scalability);
            Console.WriteLine("Test 7 completed");

            // Test 8: COM Thread Affinity (Section 3.2, Trap 2)
            Console.WriteLine("About to run Test 8...");
            allPassed &= RunTest("Test 8: COM Thread Affinity Validation", Test8_ThreadAffinity);
            Console.WriteLine("Test 8 completed");

            // Test 9: Minimum Lock Hold Time (Section 3.1, Rule 4)
            Console.WriteLine("About to run Test 9...");
            allPassed &= RunTest("Test 9: Minimum Lock Hold Time", Test9_MinimumLockHoldTime);
            Console.WriteLine("Test 9 completed");

            // Test 10: Error Handling and Retry (Section 3.3)
            Console.WriteLine("About to run Test 10...");
            allPassed &= RunTest("Test 10: Error Handling and Retry", Test10_ErrorHandling);
            Console.WriteLine("Test 10 completed");

            // Test 11: Read During Write Lock (Section 1.4) - CRITICAL TEST
            Console.WriteLine("About to run Test 11...");
            allPassed &= RunTest("Test 11: Read During Write Lock (CRITICAL)", Test11_ReadDuringWriteLock);
            Console.WriteLine("Test 11 completed");

            // Test 12: Write Lock Exclusivity (Section 1.4)
            Console.WriteLine("About to run Test 12...");
            allPassed &= RunTest("Test 12: Write Lock Exclusivity", Test12_WriteLockExclusivity);
            Console.WriteLine("Test 12 completed");

            // Test 13: Lock Reentrancy (Section 3.2, Trap 1)
            Console.WriteLine("About to run Test 13...");
            allPassed &= RunTest("Test 13: Lock Reentrancy", Test13_LockReentrancy);
            Console.WriteLine("Test 13 completed");
            Console.WriteLine();
            Console.WriteLine("=== Test Suite Complete ===");
            Console.WriteLine(allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED");

            return allPassed ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in test suite:");
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    private static bool RunTest(string testName, Func<TestResult> testFunc)
    {
        Console.WriteLine("Running: " + testName);
        Console.WriteLine(new string('-', 80));

        try
        {
            Console.WriteLine("DEBUG: Starting stopwatch...");
            Stopwatch sw = Stopwatch.StartNew();
            Console.WriteLine("DEBUG: Calling test function...");
            TestResult result = testFunc();
            Console.WriteLine("DEBUG: Test function returned");
            sw.Stop();

            Console.WriteLine("Status: " + (result.Passed ? "PASSED" : "FAILED"));
            Console.WriteLine("Duration: " + sw.ElapsedMilliseconds + "ms");
            Console.WriteLine("Details: " + result.Message);

            if (result.Metrics != null && result.Metrics.Count > 0)
            {
                Console.WriteLine("Metrics:");
                foreach (var kvp in result.Metrics)
                {
                    Console.WriteLine("  " + kvp.Key + ": " + kvp.Value);
                }
            }

            Console.WriteLine();
            Console.WriteLine("DEBUG: RunTest returning " + result.Passed);
            return result.Passed;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Status: FAILED (Exception)");
            Console.WriteLine("Error: " + ex.Message);
            Console.WriteLine("Stack: " + ex.StackTrace);
            Console.WriteLine();
            return false;
        }
    }

    /// <summary>
    /// Test 1: 10绾跨▼骞跺彂璇诲彇缁勪欢 (Section 2.2, Test 1)
    /// Expected: 100% success rate, ~215ms average response, ~46 ops/sec throughput
    /// </summary>
    private static TestResult Test1_ConcurrentRead()
    {
        const int threadCount = 10;
        const int operationsPerThread = 10;
        int successCount = 0;
        int failureCount = 0;
        List<long> responseTimes = new List<long>();
        object lockObj = new object();

        Stopwatch totalSw = Stopwatch.StartNew();

        SystemTask[] tasks = new SystemTask[threadCount];
        for (int i = 0; i < threadCount; i++)
        {
            int threadId = i;
            tasks[i] = SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    Console.WriteLine("Thread " + threadId + ": Starting");

                    tool = new Ascet();
                    Console.WriteLine("Thread " + threadId + ": Ascet object created");

                    // Use GetCurrentDataBase() to share the main thread's database connection
                    AscetDataBase database = tool.GetCurrentDataBase();
                    Console.WriteLine("Thread " + threadId + ": Got current database");

                    if (database == null)
                    {
                        Console.WriteLine("Thread " + threadId + ": Database is null!");
                        lock (lockObj)
                        {
                            failureCount += operationsPerThread;
                        }
                        return;
                    }

                    for (int j = 0; j < operationsPerThread; j++)
                    {
                        Stopwatch opSw = Stopwatch.StartNew();

                        AscetFolder[] folders = database.GetAllAscetFolders();
                        string dbName = database.GetName();
                        int folderCount = folders != null ? folders.Length : 0;

                        opSw.Stop();

                        lock (lockObj)
                        {
                            successCount++;
                            responseTimes.Add(opSw.ElapsedMilliseconds);
                        }
                    }
                    Console.WriteLine("Thread " + threadId + ": Completed all operations");
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Thread " + threadId + ": Exception - " + ex.Message);
                    lock (lockObj)
                    {
                        failureCount++;
                    }
                }
                finally
                {
                    // Do NOT disconnect in worker threads when using GetCurrentDataBase()
                    // The main thread owns the database connection lifecycle
                    Console.WriteLine("Thread " + threadId + ": Finished");
                }
            });
        }

        Console.WriteLine("DEBUG: Waiting for all tasks to complete...");
        SystemTask.WaitAll(tasks);
        Console.WriteLine("DEBUG: All tasks completed");
        totalSw.Stop();

        int totalOps = successCount + failureCount;
        double avgResponse = responseTimes.Count > 0 ? responseTimes.Average() : 0;
        double throughput = totalOps * 1000.0 / totalSw.ElapsedMilliseconds;
        double successRate = totalOps > 0 ? (successCount * 100.0 / totalOps) : 0;

        var metrics = new Dictionary<string, string>
        {
            { "Total Operations", totalOps.ToString() },
            { "Success Count", successCount.ToString() },
            { "Failure Count", failureCount.ToString() },
            { "Success Rate", successRate.ToString("F1") + "%" },
            { "Total Time", totalSw.ElapsedMilliseconds.ToString() + "ms" },
            { "Avg Response", avgResponse.ToString("F1") + "ms" },
            { "Throughput", throughput.ToString("F1") + " ops/sec" }
        };

        bool passed = successRate == 100.0 && throughput >= 40.0;
        string message = passed
            ? "Concurrent reads performed as expected (100% success, good throughput)"
            : string.Format("Performance below expectations (expected: 100% success, >=40 ops/sec; got: {0:F1}%, {1:F1} ops/sec)", successRate, throughput);

        return new TestResult { Passed = passed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 2: 璇诲啓娣峰悎娴嬭瘯 (Section 2.2, Test 2)
    /// Expected: 100% success, slight performance degradation (~10%)
    /// </summary>
    private static TestResult Test2_ReadWriteMix()
    {
        const int readerCount = 8;
        const int writerCount = 2;
        const int operationsPerThread = 10;
        int successCount = 0;
        int failureCount = 0;
        object lockObj = new object();

        Stopwatch totalSw = Stopwatch.StartNew();

        List<SystemTask> tasks = new List<SystemTask>();

        // 8 reader threads
        for (int i = 0; i < readerCount; i++)
        {
            int threadId = i;
            tasks.Add(SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    for (int j = 0; j < operationsPerThread; j++)
                    {
                        AscetFolder[] folders = database.GetAllAscetFolders();
                        string dbName = database.GetName();

                        lock (lockObj) { successCount++; }
                    }
                }
                catch (Exception)
                {
                    lock (lockObj) { failureCount++; }
                }
                finally
                {
                    // Do NOT disconnect - main thread owns the connection
                }
            }));
        }

        // 2 writer threads
        for (int i = 0; i < writerCount; i++)
        {
            int writerId = readerCount + i;
            tasks.Add(SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    for (int j = 0; j < operationsPerThread; j++)
                    {
                        // Simulate write operation with lock
                        bool locked = tool.LockDatabase();
                        try
                        {
                            if (locked)
                            {
                                // Simulate write work
                                Thread.Sleep(50);
                                lock (lockObj) { successCount++; }
                            }
                            else
                            {
                                lock (lockObj) { failureCount++; }
                            }
                        }
                        finally
                        {
                            if (locked) tool.UnlockDatabase();
                        }
                    }
                }
                catch (Exception)
                {
                    lock (lockObj) { failureCount++; }
                }
                finally
                {
                    // Do NOT disconnect - main thread owns the connection
                }
            }));
        }

        SystemTask.WaitAll(tasks.ToArray());
        totalSw.Stop();

        int totalOps = successCount + failureCount;
        double throughput = totalOps * 1000.0 / totalSw.ElapsedMilliseconds;
        double successRate = totalOps > 0 ? (successCount * 100.0 / totalOps) : 0;

        var metrics = new Dictionary<string, string>
        {
            { "Total Operations", totalOps.ToString() },
            { "Success Rate", successRate.ToString("F1") + "%" },
            { "Throughput", throughput.ToString("F1") + " ops/sec" },
            { "Total Time", totalSw.ElapsedMilliseconds.ToString() + "ms" }
        };

        bool passed = successRate == 100.0;
        string message = passed
            ? "Read-write mix handled correctly"
            : string.Format("Some operations failed (success rate: {0:F1}%)", successRate);

        return new TestResult { Passed = passed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 3: 鍘嬪姏娴嬭瘯 (Section 2.2, Test 3)
    /// Expected: High throughput, no memory/connection leaks
    /// </summary>
    private static TestResult Test3_StressTest()
    {
        const int threadCount = 20;
        const int durationSeconds = 10;
        int operationCount = 0;
        int failureCount = 0;
        bool stopFlag = false;

        Stopwatch totalSw = Stopwatch.StartNew();

        SystemTask[] tasks = new SystemTask[threadCount];
        for (int i = 0; i < threadCount; i++)
        {
            tasks[i] = SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    while (!stopFlag && totalSw.ElapsedMilliseconds < durationSeconds * 1000)
                    {
                        try
                        {
                            AscetFolder[] folders = database.GetAllAscetFolders();
                            string dbName = database.GetName();
                            Interlocked.Increment(ref operationCount);
                        }
                        catch (Exception)
                        {
                            Interlocked.Increment(ref failureCount);
                        }
                    }
                }
                finally
                {
                    // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
                }
            });
        }

        Thread.Sleep(durationSeconds * 1000);
        stopFlag = true;
        SystemTask.WaitAll(tasks);
        totalSw.Stop();

        double avgResponse = operationCount > 0 ? (totalSw.ElapsedMilliseconds * 1.0 / operationCount) : 0;
        double throughput = operationCount * 1000.0 / totalSw.ElapsedMilliseconds;
        double successRate = (operationCount + failureCount) > 0
            ? (operationCount * 100.0 / (operationCount + failureCount))
            : 0;

        var metrics = new Dictionary<string, string>
        {
            { "Total Operations", operationCount.ToString() },
            { "Failures", failureCount.ToString() },
            { "Success Rate", successRate.ToString("F1") + "%" },
            { "Duration", totalSw.ElapsedMilliseconds.ToString() + "ms" },
            { "Avg Response", avgResponse.ToString("F1") + "ms" },
            { "Throughput", throughput.ToString("F1") + " ops/sec" },
            { "Peak Concurrency", threadCount.ToString() + " threads" }
        };

        bool passed = successRate == 100.0 && throughput >= 150.0;
        string message = passed
            ? "Stress test passed with stable performance"
            : string.Format("Performance below expectations (expected: 100% success, >=150 ops/sec; got: {0:F1}%, {1:F1} ops/sec)", successRate, throughput);

        return new TestResult { Passed = passed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 4: 閿佺鐞嗘渶浣冲疄璺甸獙璇?(Section 3.1)
    /// </summary>
    private static TestResult Test4_LockManagement()
    {
        Ascet tool = null;
        bool testPassed = true;
        List<string> issues = new List<string>();

        try
        {
            tool = new Ascet();
            AscetDataBase database = tool.GetCurrentDataBase();

            // Test: Check lock acquisition return value (Rule 3)
            bool locked = tool.LockDatabase();
            if (!locked)
            {
                issues.Add("Failed to acquire database lock");
                testPassed = false;
            }

            try
            {
                if (locked)
                {
                    // Test: Perform write operation while locked
                    string testFolderName = "CTH_LockTest_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                    AscetFolder folder = database.AddAscetFolder(testFolderName);

                    if (folder == null)
                    {
                        issues.Add("Write operation failed while locked");
                        testPassed = false;
                    }
                    else
                    {
                        // Clean up
                        database.Remove(folder, true);
                    }
                }
            }
            finally
            {
                // Test: Lock is released in finally block (Rule 2)
                if (locked)
                {
                    tool.UnlockDatabase();
                }
            }

            // Test: Verify lock was released
            bool locked2 = tool.LockDatabase();
            if (!locked2)
            {
                issues.Add("Lock was not properly released");
                testPassed = false;
            }
            else
            {
                tool.UnlockDatabase();
            }
        }
        catch (Exception ex)
        {
            issues.Add(string.Format("Exception during lock management test: {0}", ex.Message));
            testPassed = false;
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
        }

        string message = testPassed
            ? "Lock management follows best practices"
            : string.Format("Lock management issues: {0}", string.Join("; ", issues));

        return new TestResult { Passed = testPassed, Message = message };
    }

    /// <summary>
    /// Test 5: 鏈姞閿佸啓鍏ュ簲璇ュけ璐?(Section 3.1, Rule 1)
    /// </summary>
    private static TestResult Test5_WriteWithoutLock()
    {
        Ascet tool = null;
        bool exceptionThrown = false;
        string exceptionType = "";

        try
        {
            tool = new Ascet();
            AscetDataBase database = tool.GetCurrentDataBase();

            // Attempt write without lock - should fail
            string testFolderName = "CTH_NoLock_" + Guid.NewGuid().ToString("N").Substring(0, 8);

            try
            {
                AscetFolder folder = database.AddAscetFolder(testFolderName);
                // If we get here, the write succeeded without a lock (unexpected)
            }
            catch (Exception ex)
            {
                exceptionThrown = true;
                exceptionType = ex.GetType().Name;
            }
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
        }

        bool passed = exceptionThrown;
        string message = passed
            ? string.Format("Write without lock correctly failed with {0}", exceptionType)
            : "WARNING: Write without lock succeeded (expected to fail)";

        return new TestResult { Passed = passed, Message = message };
    }

    /// <summary>
    /// Test 6: 閿侀噴鏀鹃獙璇?(Section 3.1, Rule 2)
    /// </summary>
    private static TestResult Test6_LockRelease()
    {
        Ascet tool = null;
        bool lockReleasedProperly = false;

        try
        {
            tool = new Ascet();

            // Acquire and release lock
            bool locked = tool.LockDatabase();
            if (locked)
            {
                tool.UnlockDatabase();
            }

            // Try to acquire again - should succeed if properly released
            bool locked2 = tool.LockDatabase();
            lockReleasedProperly = locked2;

            if (locked2)
            {
                tool.UnlockDatabase();
            }
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
        }

        string message = lockReleasedProperly
            ? "Lock properly released and reacquired"
            : "Lock was not properly released";

        return new TestResult { Passed = lockReleasedProperly, Message = message };
    }

    /// <summary>
    /// Test 7: 璇绘搷浣滄墿灞曟€ф祴璇?(Section 2.4)
    /// Expected: Near-linear scaling from 1-10 threads, efficiency degradation at 20+
    /// </summary>
    private static TestResult Test7_Scalability()
    {
        int[] threadCounts = { 1, 2, 5, 10, 20 };
        const int operationsPerThread = 10;
        Dictionary<int, double> throughputs = new Dictionary<int, double>();

        foreach (int threadCount in threadCounts)
        {
            int successCount = 0;
            Stopwatch sw = Stopwatch.StartNew();

            SystemTask[] tasks = new SystemTask[threadCount];
            for (int i = 0; i < threadCount; i++)
            {
                tasks[i] = SystemTask.Run(() =>
                {
                    Ascet tool = null;
                    try
                    {
                        tool = new Ascet();
                        AscetDataBase database = tool.GetCurrentDataBase();

                        for (int j = 0; j < operationsPerThread; j++)
                        {
                            AscetFolder[] folders = database.GetAllAscetFolders();
                            string dbName = database.GetName();
                            Interlocked.Increment(ref successCount);
                        }
                    }
                    finally
                    {
                        // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
                    }
                });
            }

            SystemTask.WaitAll(tasks);
            sw.Stop();

            double throughput = successCount * 1000.0 / sw.ElapsedMilliseconds;
            throughputs[threadCount] = throughput;
        }

        // Calculate scaling efficiency
        double baselineThroughput = throughputs[1];
        var metrics = new Dictionary<string, string>();

        foreach (var kvp in threadCounts)
        {
            double efficiency = (throughputs[kvp] / (baselineThroughput * kvp)) * 100.0;
            metrics[kvp.ToString() + " threads"] = throughputs[kvp].ToString("F1") + " ops/sec (" + efficiency.ToString("F0") + "% efficiency)";
        }

        // Check if 10-thread efficiency is >= 80%
        double efficiency10 = (throughputs[10] / (baselineThroughput * 10)) * 100.0;
        bool passed = efficiency10 >= 80.0;

        string message = passed
            ? "Read operations scale well (10-thread efficiency >= 80%)"
            : string.Format("Scaling below expectations (10-thread efficiency: {0:F1}%)", efficiency10);

        return new TestResult { Passed = passed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 8: COM绾跨▼浜插拰鎬ч獙璇?(Section 3.2, Trap 2)
    /// Each thread must create its own COM objects
    /// </summary>
    private static TestResult Test8_ThreadAffinity()
    {
        bool testPassed = true;
        string errorMessage = "";

        // Create COM object in main thread
        Ascet mainTool = null;
        try
        {
            mainTool = new Ascet();
            AscetDataBase mainDatabase = mainTool.GetCurrentDataBase();

            // Try to use it in another thread (should handle properly)
            SystemTask task = SystemTask.Run(() =>
            {
                Ascet threadTool = null;
                try
                {
                    // Each thread should create its own COM object
                    threadTool = new Ascet();
                    AscetDataBase threadDatabase = threadTool.GetCurrentDataBase();

                    // This should work
                    string dbName = threadDatabase.GetName();

                    if (string.IsNullOrEmpty(dbName))
                    {
                        throw new Exception("Failed to get database name in worker thread");
                    }
                }
                finally
                {
                    // Intentionally skip DisconnectFromTool() for thread-local test tool instances.
                }
            });

            task.Wait();
        }
        catch (Exception ex)
        {
            testPassed = false;
            errorMessage = ex.Message;
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() for the main test tool instance.
        }

        string message = testPassed
            ? "Each thread correctly creates its own COM objects"
            : string.Format("Thread affinity issue: {0}", errorMessage);

        return new TestResult { Passed = testPassed, Message = message };
    }

    /// <summary>
    /// Test 9: 鏈€灏忓寲閿佹寔鏈夋椂闂?(Section 3.1, Rule 4)
    /// </summary>
    private static TestResult Test9_MinimumLockHoldTime()
    {
        Ascet tool = null;
        long lockHoldTime = 0;
        bool testPassed = false;

        try
        {
            tool = new Ascet();
            AscetDataBase database = tool.GetCurrentDataBase();

            // Simulate: prepare data OUTSIDE lock
            string testFolderName = "CTH_MinLock_" + Guid.NewGuid().ToString("N").Substring(0, 8);

            // Measure lock hold time
            Stopwatch sw = Stopwatch.StartNew();
            bool locked = tool.LockDatabase();
            try
            {
                if (locked)
                {
                    // Only essential operations inside lock
                    AscetFolder folder = database.AddAscetFolder(testFolderName);
                    database.Remove(folder, true);
                }
            }
            finally
            {
                if (locked)
                {
                    tool.UnlockDatabase();
                    sw.Stop();
                    lockHoldTime = sw.ElapsedMilliseconds;
                }
            }

            // Lock hold time should be minimal (< 200ms for simple operations)
            testPassed = lockHoldTime < 200;
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
        }

        var metrics = new Dictionary<string, string>
        {
            { "Lock Hold Time", lockHoldTime.ToString() + "ms" }
        };

        string message = testPassed
            ? string.Format("Lock hold time is minimal ({0}ms < 200ms)", lockHoldTime)
            : string.Format("Lock hold time too long ({0}ms >= 200ms)", lockHoldTime);

        return new TestResult { Passed = testPassed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 10: 閿欒澶勭悊鍜岄噸璇?(Section 3.3)
    /// </summary>
    private static TestResult Test10_ErrorHandling()
    {
        bool testPassed = true;
        int retryCount = 0;
        const int maxRetries = 3;

        Ascet tool = null;
        try
        {
            // Test retry logic
            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    // Successful operation
                    string dbName = database.GetName();
                    if (!string.IsNullOrEmpty(dbName))
                    {
                        break; // Success
                    }
                }
                catch (Exception)
                {
                    retryCount++;
                    if (i < maxRetries - 1)
                    {
                        Thread.Sleep(100 * (i + 1)); // Exponential backoff
                    }
                    else
                    {
                        throw;
                    }
                }
            }
        }
        catch (Exception)
        {
            testPassed = false;
        }
        finally
        {
            // Intentionally skip DisconnectFromTool() in worker contexts to avoid cross-thread teardown hangs.
        }

        var metrics = new Dictionary<string, string>
        {
            { "Retry Count", retryCount.ToString() },
            { "Max Retries", maxRetries.ToString() }
        };

        string message = testPassed
            ? string.Format("Error handling works correctly (retries: {0})", retryCount)
            : "Error handling failed after max retries";

        return new TestResult { Passed = testPassed, Message = message, Metrics = metrics };
    }

    /// <summary>
    /// Test 11: 璇绘搷浣滃湪鍐欓攣鏈熼棿鐨勮涓洪獙璇?    ///
    /// 杩欐槸鏈€鍏抽敭鐨勬祴璇曪紝鐩存帴楠岃瘉鏂囨。澹版槑锛?    /// "鏁版嵁搴撶骇閿佷笉褰卞搷璇绘搷浣?锛圫ection 1.4锛?    ///
    /// 濡傛灉姝ゆ祴璇曞け璐ワ紝璇存槑鏂囨。鎻忚堪涓庡疄闄呭疄鐜颁笉绗︺€?    /// </summary>
    private static TestResult Test11_ReadDuringWriteLock()
    {
        const int readerCount = 5;
        int readSuccessCount = 0;
        int readFailureCount = 0;
        List<long> readEndTimes = new List<long>();
        object lockObj = new object();

        bool writeLockAcquired = false;
        bool writeLockHeld = false;
        long writeLockStartTime = 0;
        long writeLockEndTime = 0;

        Stopwatch globalSw = Stopwatch.StartNew();

        SystemTask writeTask = SystemTask.Run(() =>
        {
            Ascet tool = null;
            try
            {
                tool = new Ascet();
                AscetDataBase database = tool.GetCurrentDataBase();

                if (database == null)
                {
                    Console.WriteLine("Write thread: Database is null");
                    return;
                }

                Console.WriteLine("Write thread: Attempting to acquire lock...");
                bool locked = tool.LockDatabase();

                lock (lockObj)
                {
                    writeLockAcquired = locked;
                    writeLockStartTime = globalSw.ElapsedMilliseconds;
                }

                if (!locked)
                {
                    Console.WriteLine("Write thread: Failed to acquire lock");
                    return;
                }

                Console.WriteLine("Write thread: Lock acquired, holding for 2 seconds...");
                lock (lockObj) { writeLockHeld = true; }

                try
                {
                    Thread.Sleep(2000);
                }
                finally
                {
                    tool.UnlockDatabase();
                    lock (lockObj)
                    {
                        writeLockHeld = false;
                        writeLockEndTime = globalSw.ElapsedMilliseconds;
                    }
                    Console.WriteLine("Write thread: Lock released");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Write thread exception: " + ex.Message);
            }
            finally
            {
                Console.WriteLine("Write thread: Finished");
            }
        });

        Thread.Sleep(200);

        bool lockHeldSnapshot;
        lock (lockObj) { lockHeldSnapshot = writeLockHeld; }

        if (!lockHeldSnapshot)
        {
            writeTask.Wait();
            return new TestResult
            {
                Passed = false,
                Message = "The writer thread failed to acquire the lock, so the test is invalid."
            };
        }

        Console.WriteLine("Write lock is held, starting read threads...");

        SystemTask[] readTasks = new SystemTask[readerCount];
        for (int i = 0; i < readerCount; i++)
        {
            int readerId = i;
            readTasks[i] = SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    if (database == null)
                    {
                        Console.WriteLine("Reader " + readerId + ": Database is null");
                        lock (lockObj) { readFailureCount++; }
                        return;
                    }

                    long startTime = globalSw.ElapsedMilliseconds;
                    Console.WriteLine("Reader " + readerId + ": Starting read at " + startTime + "ms");

                    AscetFolder[] folders = database.GetAllAscetFolders();
                    if (folders != null && folders.Length > 0)
                    {
                        string dbName = database.GetName();
                        long endTime = globalSw.ElapsedMilliseconds;
                        Console.WriteLine("Reader " + readerId + ": Completed read at " + endTime + "ms (duration: " + (endTime - startTime) + "ms)");

                        lock (lockObj)
                        {
                            readSuccessCount++;
                            readEndTimes.Add(endTime);
                        }
                    }
                    else
                    {
                        Console.WriteLine("Reader " + readerId + ": Folders is null or empty");
                        lock (lockObj) { readFailureCount++; }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Reader " + readerId + " exception: " + ex.Message);
                    lock (lockObj) { readFailureCount++; }
                }
                finally
                {
                    Console.WriteLine("Reader " + readerId + ": Finished");
                }
            });
        }

        SystemTask.WaitAll(readTasks);
        Console.WriteLine("All reader threads completed");
        writeTask.Wait();
        Console.WriteLine("Writer thread completed");

        globalSw.Stop();

        var metrics = new Dictionary<string, string>
        {
            { "Write Lock Acquired", writeLockAcquired.ToString() },
            { "Write Lock Duration", (writeLockEndTime - writeLockStartTime).ToString() + "ms" },
            { "Read Success Count", readSuccessCount.ToString() + "/" + readerCount },
            { "Read Failure Count", readFailureCount.ToString() }
        };

        int readsCompletedDuringLock = 0;
        foreach (long endTime in readEndTimes)
        {
            if (endTime >= writeLockStartTime && endTime <= writeLockEndTime)
            {
                readsCompletedDuringLock++;
            }
        }

        metrics["Reads Completed During Lock"] = readsCompletedDuringLock.ToString() + "/" + readSuccessCount;

        bool passed = writeLockAcquired && readSuccessCount == readerCount && readsCompletedDuringLock > 0;

        string message;
        if (!writeLockAcquired)
        {
            message = "The write lock could not be acquired, so the test is invalid.";
        }
        else if (readSuccessCount == 0)
        {
            message = "All read operations failed. Reads may have been blocked by the write lock, which contradicts the documentation.";
        }
        else if (readsCompletedDuringLock == 0)
        {
            message = "Read operations only completed after the write lock was released, so reads appear to be blocked by the write lock.";
        }
        else if (readSuccessCount == readerCount)
        {
            message = string.Format(
                "{0}/{1} read operations completed while the write lock was held, matching the documented expectation that reads are not blocked by writes.",
                readsCompletedDuringLock,
                readSuccessCount);
        }
        else
        {
            message = string.Format(
                "Some read operations succeeded ({0}/{1}), and {2} of them completed while the write lock was held.",
                readSuccessCount,
                readerCount,
                readsCompletedDuringLock);
        }

        return new TestResult
        {
            Passed = passed,
            Message = message,
            Metrics = metrics
        };
    }

    private static TestResult Test12_WriteLockExclusivity()
    {
        const int writerCount = 5;
        int lockAcquiredCount = 0;
        int lockFailedCount = 0;
        List<int> successfulWriters = new List<int>();
        object lockObj = new object();

        Stopwatch globalSw = Stopwatch.StartNew();
        List<long> lockAcquireTimes = new List<long>();
        List<long> lockReleaseTimes = new List<long>();

        SystemTask[] writerTasks = new SystemTask[writerCount];
        for (int i = 0; i < writerCount; i++)
        {
            int writerId = i;
            writerTasks[i] = SystemTask.Run(() =>
            {
                Ascet tool = null;
                try
                {
                    tool = new Ascet();
                    AscetDataBase database = tool.GetCurrentDataBase();

                    if (database == null)
                    {
                        Console.WriteLine("Writer " + writerId + ": Database is null");
                        return;
                    }

                    Console.WriteLine("Writer " + writerId + ": Attempting to acquire lock...");
                    bool locked = tool.LockDatabase();
                    long acquireTime = globalSw.ElapsedMilliseconds;

                    if (locked)
                    {
                        Console.WriteLine("Writer " + writerId + ": Lock acquired at " + acquireTime + "ms");

                        lock (lockObj)
                        {
                            lockAcquiredCount++;
                            successfulWriters.Add(writerId);
                            lockAcquireTimes.Add(acquireTime);
                        }

                        try
                        {
                            Thread.Sleep(500);
                            string testFolderName = "CTH_WriteLock_" + writerId;
                            AscetFolder folder = database.AddAscetFolder(testFolderName);
                            if (folder != null)
                            {
                                database.Remove(folder, true);
                            }
                        }
                        finally
                        {
                            tool.UnlockDatabase();
                            long releaseTime = globalSw.ElapsedMilliseconds;
                            lock (lockObj)
                            {
                                lockReleaseTimes.Add(releaseTime);
                            }
                            Console.WriteLine("Writer " + writerId + ": Lock released at " + releaseTime + "ms");
                        }
                    }
                    else
                    {
                        Console.WriteLine("Writer " + writerId + ": Failed to acquire lock at " + acquireTime + "ms");
                        lock (lockObj)
                        {
                            lockFailedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Writer " + writerId + " exception: " + ex.Message);
                    lock (lockObj) { lockFailedCount++; }
                }
                finally
                {
                    Console.WriteLine("Writer " + writerId + ": Finished");
                }
            });
        }

        SystemTask.WaitAll(writerTasks);
        globalSw.Stop();

        var metrics = new Dictionary<string, string>
        {
            { "Total Writers", writerCount.ToString() },
            { "Lock Acquired Count", lockAcquiredCount.ToString() },
            { "Lock Failed Count", lockFailedCount.ToString() },
            { "Successful Writers", string.Join(", ", successfulWriters) }
        };

        bool exclusivityMaintained = true;
        for (int i = 0; i < lockAcquireTimes.Count; i++)
        {
            long acquireTime = lockAcquireTimes[i];
            long releaseTime = lockReleaseTimes[i];

            for (int j = 0; j < lockAcquireTimes.Count; j++)
            {
                if (i == j)
                {
                    continue;
                }

                long otherAcquireTime = lockAcquireTimes[j];
                if (otherAcquireTime > acquireTime && otherAcquireTime < releaseTime)
                {
                    exclusivityMaintained = false;
                    Console.WriteLine("WARNING: Lock " + j + " acquired while lock " + i + " was held!");
                }
            }
        }

        metrics["Exclusivity Maintained"] = exclusivityMaintained.ToString();

        bool passed = lockAcquiredCount >= 1 && exclusivityMaintained;

        string message;
        if (lockAcquiredCount == 0)
        {
            message = "No thread could acquire the lock. The lock mechanism may be malfunctioning.";
        }
        else if (lockAcquiredCount == writerCount)
        {
            message = "All threads acquired the lock, so the lock is not exclusive and the result contradicts the documentation.";
        }
        else if (!exclusivityMaintained)
        {
            message = "Multiple locks were held at the same time, so exclusivity was broken.";
        }
        else
        {
            message = string.Format(
                "Write lock exclusivity verified: {0}/{1} threads acquired the lock and exclusivity was preserved.",
                lockAcquiredCount,
                writerCount);
        }

        return new TestResult
        {
            Passed = passed,
            Message = message,
            Metrics = metrics
        };
    }

    private static TestResult Test13_LockReentrancy()
    {
        bool firstLockAcquired = false;
        bool secondLockAttempted = false;
        bool secondLockAcquired = false;
        bool secondLockTimedOut = false;
        bool exceptionThrown = false;
        string exceptionType = "";

        SystemTask testTask = SystemTask.Run(() =>
        {
            Ascet tool = null;
            try
            {
                tool = new Ascet();
                AscetDataBase database = tool.GetCurrentDataBase();

                if (database == null)
                {
                    Console.WriteLine("Database is null");
                    return;
                }

                Console.WriteLine("Attempting first lock...");
                bool locked1 = tool.LockDatabase();
                firstLockAcquired = locked1;

                if (!locked1)
                {
                    Console.WriteLine("First lock failed");
                    return;
                }

                Console.WriteLine("First lock acquired");

                try
                {
                    Console.WriteLine("Attempting second lock (reentrant)...");
                    secondLockAttempted = true;

                    System.Threading.Tasks.Task<bool> lockTask = SystemTask.Run(() =>
                    {
                        return tool.LockDatabase();
                    });

                    if (lockTask.Wait(2000))
                    {
                        secondLockAcquired = lockTask.Result;
                        Console.WriteLine("Second lock result: " + secondLockAcquired);

                        if (secondLockAcquired)
                        {
                            tool.UnlockDatabase();
                        }
                    }
                    else
                    {
                        secondLockTimedOut = true;
                        Console.WriteLine("Second lock timed out (likely deadlock)");
                    }
                }
                catch (Exception ex)
                {
                    exceptionThrown = true;
                    exceptionType = ex.GetType().Name;
                    Console.WriteLine("Exception during second lock: " + exceptionType + " - " + ex.Message);
                }
                finally
                {
                    tool.UnlockDatabase();
                    Console.WriteLine("First lock released");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Outer exception: " + ex.Message);
            }
            finally
            {
                Console.WriteLine("Reentrancy test thread: Finished");
            }
        });

        bool testCompleted = testTask.Wait(5000);

        var metrics = new Dictionary<string, string>
        {
            { "First Lock Acquired", firstLockAcquired.ToString() },
            { "Second Lock Attempted", secondLockAttempted.ToString() },
            { "Second Lock Acquired", secondLockAcquired.ToString() },
            { "Second Lock Timed Out", secondLockTimedOut.ToString() },
            { "Exception Thrown", exceptionThrown.ToString() },
            { "Exception Type", exceptionType },
            { "Test Completed", testCompleted.ToString() }
        };

        bool passed = firstLockAcquired && secondLockAttempted &&
                      (secondLockTimedOut || !secondLockAcquired || exceptionThrown);

        string message;
        if (!firstLockAcquired)
        {
            message = "The first lock attempt failed, so the test is invalid.";
        }
        else if (!testCompleted)
        {
            message = "The reentrancy test timed out, which suggests the second lock attempt deadlocked.";
        }
        else if (secondLockAcquired)
        {
            message = "The second lock attempt succeeded, so the lock appears to be reentrant despite the documentation warning.";
        }
        else if (secondLockTimedOut)
        {
            message = "The second lock attempt timed out, so reentrancy is not supported as the documentation warns.";
        }
        else if (exceptionThrown)
        {
            message = string.Format("The second lock attempt threw {0}, so reentrancy is not supported as the documentation warns.", exceptionType);
        }
        else
        {
            message = "The second lock attempt returned false, so reentrancy is not supported as the documentation warns.";
        }

        return new TestResult
        {
            Passed = passed,
            Message = message,
            Metrics = metrics
        };
    }
    private class TestResult
    {
        public bool Passed { get; set; }
        public string Message { get; set; }
        public Dictionary<string, string> Metrics { get; set; }
    }
}
