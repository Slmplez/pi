# RSFlipFlop

| Column 1 | Column 2 |
| --- | --- |
|  | RSFlipFlop is a flip flop with a reset and a set input, where the reset input dominates the set input. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | r ::logical s ::logical | none |
| q | none | logical |
| nq | none | logical |

On activation of method

Compute

If r is TRUE, the state of the flip flop is set to FALSE. Otherwise, if s is TRUE, the state is set to TRUE. If both r and s are FALSE, the state is left unchanged.

Q

The state of the flip flop is returned.

NQ

The negated value of the state is returned.
