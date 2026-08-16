# DeltaOneStep (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | DeltaOnestep returns the difference between the current and the last input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV:: continuous |  |
|  | R :: logical |  |
|  | u:: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE), the difference between the current and the last input value u is buffered. If reset is enabled, the difference between u and IV is buffered.

y

Returns the buffered value.
