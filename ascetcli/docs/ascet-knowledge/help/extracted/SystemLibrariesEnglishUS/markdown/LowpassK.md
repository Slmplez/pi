# LowpassK

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassK is a simplified PT1-function with gain constant K (low pass filter) . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The lowpass value is set to initValue.

Compute

The lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT*K.

Out

The lowpass value is returned.
