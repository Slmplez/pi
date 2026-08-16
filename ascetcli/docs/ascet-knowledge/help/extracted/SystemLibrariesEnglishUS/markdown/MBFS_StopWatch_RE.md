# StopWatchResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchResetEnabled outputs the time since the system init or the last reset. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | E:: logical | continuous |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns the time since the system init or the last reset. If reset is enabled, the time is reset to zero.
