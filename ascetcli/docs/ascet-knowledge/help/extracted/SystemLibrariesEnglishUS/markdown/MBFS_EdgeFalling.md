# EdgeFalling (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeFalling returns TRUE if the input value changes from TRUE to FALSE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) TRUE is buffered if the input value changes from TRUE to FALSE.

y

returns the buffered value x.
