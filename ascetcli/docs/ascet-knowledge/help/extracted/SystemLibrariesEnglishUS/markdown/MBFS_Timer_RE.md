# TimerResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerResetEnabled returns TRUE, if the initial time IV set at the last reset has not yet run down to zero. Reset can only be performed, after the counter has run down to zero. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled and E = TRUE, TRUE is returned if the initial time IV set at the last reset has not yet run down to zero. Otherwise, FALSE is returned.

If reset is enabled (i.e. R is TRUE and the variable x  0), the method returns TRUE for IV > 0 and FALSE for IV < 0.
