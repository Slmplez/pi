# DelayValueEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DelayValueEnabled delays its input value by one evaluation step. It must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical initValue ::continuous | none |
| compute | value ::continuous enable ::logical | none |
| out | none | logical |

On activation of method

Reset

If initEnable is TRUE, initValue is buffered.

Compute

If enable is TRUE, the input value is buffered.

Out

The buffered value is returned, thus the input value is delayed by one step.
