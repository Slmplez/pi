# DifferenceQuotient (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | DifferenceQuotient returns the rate of change of the input signal u over time. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV:: continuous |  |
|  | R :: logical |  |
|  | u:: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) the rate of change of the input signal u over time is buffered.

If reset is enabled, (u - IV) : dT is buffered.

y

returns the buffered value.
