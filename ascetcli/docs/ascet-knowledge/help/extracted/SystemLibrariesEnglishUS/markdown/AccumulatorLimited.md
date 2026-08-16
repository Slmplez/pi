# AccumulatorLimited

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorLimited adds up its input value. Its accumulator value can be limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | value ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The accumulator value is set to initValue.

Compute

The accumulator is incremented by the input value, i.e. accumulator(new) = accumulator(old) + input value. Additionally, the accumulator value is limited by mn and mx.

Out

The accumulator value is returned.
