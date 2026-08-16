# CounterEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | Counter increments the counter by one. This counter must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical | none |
| compute | enable ::logical | none |
| out | none | unsigned discrete |

On activation of method

Reset

If initEnable is TRUE, the counter is set to zero.

Compute

If enable is TRUE, the counter is incremented by one.

Out

The counter value is returned.
