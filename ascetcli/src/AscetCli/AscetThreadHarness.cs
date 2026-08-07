using System;
using System.Collections.Generic;
using System.Threading;

class AscetThreadHarness
{
    static int Main(string[] args)
    {
        try
        {
            int readerCount = GetIntArg(args, 0, 2);
            int writerCount = GetIntArg(args, 1, 1);
            int iterations = GetIntArg(args, 2, 5);
            int joinTimeoutMilliseconds = GetIntArg(args, 3, 60000);

            List<ThreadWorker> workers = new List<ThreadWorker>();

            for (int i = 0; i < readerCount; i++)
            {
                string workerId = "thread-reader-" + (i + 1);
                workers.Add(StartWorker(workerId, "read", iterations));
            }

            for (int i = 0; i < writerCount; i++)
            {
                string workerId = "thread-writer-" + (i + 1);
                workers.Add(StartWorker(workerId, "write", iterations));
            }

            List<ConcurrencyRunResult> results = new List<ConcurrencyRunResult>();
            foreach (ThreadWorker worker in workers)
            {
                if (!worker.Thread.Join(joinTimeoutMilliseconds))
                {
                    results.Add(new ConcurrencyRunResult
                    {
                        WorkerId = worker.WorkerId,
                        Mode = worker.Mode,
                        Iterations = iterations,
                        SuccessCount = 0,
                        FailureCount = iterations,
                        FirstError = "Timeout waiting for STA worker thread."
                    });
                    continue;
                }

                if (worker.Error != null)
                {
                    results.Add(new ConcurrencyRunResult
                    {
                        WorkerId = worker.WorkerId,
                        Mode = worker.Mode,
                        Iterations = iterations,
                        SuccessCount = 0,
                        FailureCount = iterations,
                        FirstError = worker.Error.GetType().Name + ": " + worker.Error.Message
                    });
                    continue;
                }

                results.Add(worker.Result);
            }

            Console.Write(AscetConcurrencySupport.FormatAggregateSummary(results, "threaded"));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    private static int GetIntArg(string[] args, int index, int fallback)
    {
        return args.Length > index ? Int32.Parse(args[index]) : fallback;
    }

    private static ThreadWorker StartWorker(string workerId, string mode, int iterations)
    {
        ThreadWorker worker = new ThreadWorker
        {
            WorkerId = workerId,
            Mode = mode
        };

        Thread thread = new Thread(delegate()
        {
            try
            {
                worker.Result = AscetConcurrencySupport.ExecuteWorker(workerId, mode, iterations);
            }
            catch (Exception ex)
            {
                worker.Error = ex;
            }
        });

        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        worker.Thread = thread;
        thread.Start();
        return worker;
    }

    private sealed class ThreadWorker
    {
        public string WorkerId;
        public string Mode;
        public Thread Thread;
        public ConcurrencyRunResult Result;
        public Exception Error;
    }
}
