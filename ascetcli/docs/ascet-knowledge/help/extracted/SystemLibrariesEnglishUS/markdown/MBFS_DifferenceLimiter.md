# DifferenceLimiter

| Column 1 | Column 2 |
| --- | --- |
|  | DifferenceLimiter increments the output value y by the limited difference between consecutive input values. D u = u(n) - u(n-1): The input parameters can have signs, and the condition LU ≥ LD is assumed, but not checked. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV:: continuous |  |
|  | LD ::continuous |  |
|  | LU ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the output is buffered in the variable y as follows:

if ( (u-y) > LU ) { y = y+LU; B_min = 0; B_max = 1; } else if ( (u-y) < LD ) { y = y+LD; B_min = 1; B_max = 0; } else { y = u; B_min = 0; B_max = 0; }

If reset is enabled (i.e. R = TRUE), the initial value IV is buffered in the variable y.

B_max

The value stored in B_max is returned.

B_min

The value stored in B_min is returned.

y

The value buffered in y is returned.
