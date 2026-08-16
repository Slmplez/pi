# EdgeRising (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeRising returns TRUE if the input value changes from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) TRUE is buffered if the input value changes from FALSE to TRUE.

y

returns the buffered value x.
