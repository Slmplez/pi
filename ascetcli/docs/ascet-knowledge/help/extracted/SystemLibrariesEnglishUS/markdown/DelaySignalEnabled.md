# DelaySignalEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DelaySignalEnabled delays its input signal by one evaluation step. It must be enabled explicitly . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical initValue ::logical | none |
| compute | signal ::logical enable ::logical | none |
| out | none | logical |

On activation of method

Reset

If initEnable is TRUE, initValue is buffered.

Compute

If enable is TRUE, the input signal is buffered.

Out

The buffered signal is returned, thus the input signal is delayed by one step.
