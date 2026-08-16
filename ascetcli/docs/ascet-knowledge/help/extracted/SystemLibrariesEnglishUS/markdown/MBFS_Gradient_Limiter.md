# GradientLimiter

| Column 1 | Column 2 |
| --- | --- |
|  | GradientLimiter increments the output value y by the limited difference between consecutive input values over time D u. The input parameters can have signs, and the condition LU ≥ LD is assumed, but not checked. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV ::continuous |  |
|  | LU ::continuous |  |
|  | LD ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the output is buffered in the variable y as follows:

if ( ((u-y)/dT) > LU ) { y = y+LU; B_min = 0; B_max = 1; } else if ( ((u-y)/dT) < LD ) { y = y+LD; B_min = 1; B_max = 0; } else { y = u; B_min = 0; B_max = 0; }

If reset is enabled (i.e. R = TRUE), the variable y is set to the initial value IV.

B_max

The value stored in B_max is returned.

B_min

The value stored in B_min is returned.

y

The value stored in y is returned.
