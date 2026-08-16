# EdgeRising

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeRising detects a rising edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal is high and the previous input signal was low. Otherwise, FALSE is returned.
