# StopWatchResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchResetTriggerEnabled outputs the time since the system init or the last reset. The stop watch is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | E:: logical | continuous |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and StopWatch is not reset, the time since the system init or the last reset is returned. If RT switches from FALSE to TRUE, StopWatchResetTriggerEnabled is reset and 0 is returned.
