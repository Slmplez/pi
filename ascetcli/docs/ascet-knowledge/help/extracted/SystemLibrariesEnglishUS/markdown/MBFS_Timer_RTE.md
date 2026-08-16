# TimerResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerResetTriggerEnabled returns TRUE, if the initial time IV set at the last reset has not yet run down to zero. If the counter has run down to zero and RT switches from FALSE to TRUE, reset is performed. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the timer is not reset, TRUE is returned if the initial time IV set at the last reset has not yet run down to zero. Otherwise, FALSE is returned.

If RT switches from FALSE to TRUE and the timer has run down to zero, the timer is reset. TRUE is returned if IV > 0 and FALSE if IV < 0.
