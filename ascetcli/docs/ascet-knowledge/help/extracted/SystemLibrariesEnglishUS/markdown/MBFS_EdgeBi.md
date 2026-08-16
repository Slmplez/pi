# EdgeBi (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeBi returns TRUE at any change of the logical input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE), TRUE is buffered at any change of the logical input value u.

If reset is enabled, TRUE is buffered, if u and IV are not identical. Otherwise, FALSE is buffered.

y

returns the buffered value x.
