# EdgeBi

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeBi detects a bidirectional edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal and the previous input signal differ. Otherwise, FALSE is returned.
