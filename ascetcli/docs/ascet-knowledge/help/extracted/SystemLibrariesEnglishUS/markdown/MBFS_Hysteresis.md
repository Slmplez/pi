# Hysteresis

| Column 1 | Column 2 |
| --- | --- |
|  | The Hysteresis implemented in this block is the Schmitt Trigger function. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| y | IV:: logical | logical |
|  | RSP:: continuous |  |
|  | LSP:: continuous |  |
|  | R:: logical |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if u > RSP.

FALSE is returned, if u < LSP.

The state of the preceding Hysteresis is returned, if RSP ≥ u ≥ LSP.
