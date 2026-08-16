# TimerRetriggerResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerResetTriggerEnabled returns TRUE if the time x (set to the initial time IV at the last reset) has not yet run down to zero. A reset can be performed whenever required. The timer retrigger is reset if RT switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the timer is not reset, the method returns TRUE, if the number if block evaluations since the last reset is smaller than IV : dT. Otherwise FALSE is returned.

If RT switches from FALSE to TRUE, the timer is reset and TRUE is returned if IV > 0 and FALSE if IV < 0.
