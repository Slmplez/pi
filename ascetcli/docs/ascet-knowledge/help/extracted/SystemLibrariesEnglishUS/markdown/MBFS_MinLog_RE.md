# MinLogResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | MinLogResetEnabled returns the minimum value of all occurred input values u with respect to the initial value IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

B_min is set to FALSE. If reset is disabled (i.e. R = FALSE) and E = TRUE, the minimum value y of all occurred inputs is buffered. If u < y, B_min is set to TRUE; otherwise, B_min remains FALSE. If reset is enabled, the value y = IV and B_max = FALSE is buffered.

B_min

Returns the buffered state B_min.

y

Returns the buffered minimum value y.
