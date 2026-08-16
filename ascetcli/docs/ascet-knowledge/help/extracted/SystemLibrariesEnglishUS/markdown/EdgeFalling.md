# EdgeFalling

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeFalling detects a falling edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal is low and the previous input signal was high. Otherwise, FALSE is returned.
