# CountDownEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownEnabled decrements the counter and signals when the counter has reached zero. This counter must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startValue ::unsigned discrete | none |
| compute | enable ::logical | none |
| out | none | logical |

On activation of method

Start

The counter is set to the start value.

Compute

If enable is TRUE, the counter is decrement by one.

Out

TRUE is returned if the counter is greater than zero. Otherwise, FALSE is returned.
