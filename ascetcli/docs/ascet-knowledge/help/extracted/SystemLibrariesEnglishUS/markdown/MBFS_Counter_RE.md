# CounterResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CounterResetEnabled counts up and outputs the number of block evaluations since the last reset. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | continuous |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns the number of block evaluations since the last reset. If reset is enabled, the initial value IV is returned.
