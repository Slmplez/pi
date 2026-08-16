# CountDownResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownResetEnabled returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV.

If reset is enabled, TRUE is returned if IV > O and FALSE if IV < O.
