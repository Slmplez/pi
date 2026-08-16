# AccumulatorEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorEnabled adds up its input value. It must be enabled explicitly and its accumulator value can be limited |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | value ::continuous mn ::continuous mx ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the accumulator value is set to initValue.

Compute

If enable is TRUE, the accumulator is incremented by the input value, i.e. accumulator(new) = accumulator(old) + input value. Additionally, the accumulator value is limited by mn and mx.

Out

The accumulator value is returned.
