# TimerRetriggerResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerResetEnabled returns TRUE if the time x (set to the initial time IV at the last reset) has not yet run down to zero. A reset can be performed whenever required. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns TRUE, if the number of block evaluations since the last reset is smaller than IV : dT. Otherwise FALSE is returned.

If reset is enabled, TRUE is returned if IV > 0 and FALSE if IV < 0.
