# Test harness notes

1. Initial concurrent-soak attempts returned successful CLI JSON but the PowerShell harness observed a null `Process.ExitCode` and treated it as nonzero. The harness condition was corrected to validate the exit code only when populated; stdout, stderr, and response JSON remained mandatory.
2. The first final-state sample returned `openWindows=1`. The immediate retry returned 0, followed by three interval samples with `openWindows=0` and zero native Search child windows.
