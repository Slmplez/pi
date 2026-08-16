# RSFlipFlop (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | RSFlipFlop : The input RST (reset) dominates the input SET (set). The first output returns the stored boolean input value, whilst the second output value is the logical negation of the first output. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | SET ::logical |  |
|  | RST ::logical |  |
| Q | none | logical |
| _Q | none | logical |

On activation of method

compute

Buffers FALSE if RST is TRUE.

If RST = FALSE and SET = TRUE, TRUE is buffered.

If RST = FALSE and SET = FALSE, FALSE is buffered.

Q

Returns the buffered value x.

_Q

Returns the buffered value !x.
