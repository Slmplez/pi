# MaxLogResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | MaxLogResetEnabled returns the maximum value of all occurred input values with respect to the initial value IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| B_max | none | logical |
| y | none | continuous |

On activation of method

compute

B_max is set to FALSE. If reset is disabled (i.e. R = FALSE) and E = TRUE, the maximum value y of all occurred inputs is buffered. If u > y, B_max is set to TRUE; otherwise, B_max remains FALSE. If reset is enabled, the value y = IV and B_max = FALSE is buffered.

B_max

Returns the buffered state B_max.

y

Returns the buffered maximum value y.
