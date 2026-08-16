# DeadBand

| Column 1 | Column 2 |
| --- | --- |
|  | DeadBand returns zero if the input value is between UMIN and UMAX . Otherwise the output signal is the input signal reduced by the input limits. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | UMAX:: continuous | continuous |
|  | UMIN:: continuous |  |
|  | u:: continuous |  |

On activation of method

DeadBand

Returns 0 if UMIN < u < UMAX.

Returns (u - UMAX) if u ≥ UMAX.

Returns (u - UMIN) if u ≤ UMIN
