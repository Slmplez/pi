# DelayResetEnabledLogic

| Column 1 | Column 2 |
| --- | --- |
|  | DelayResetEnabledLogic delays the logical input signal u by one sample time dT . The reset value IV has direct influence on the output. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | IV:: logical | logical |
|  | E:: logical |  |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the logical input u delayed by one sample time dT is returned.

If reset is enabled the value IV is returned.
