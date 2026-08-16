# LowpassTEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassTEnabled is a simplified PT1-function with time constant T (low pass filter). It must be enabled explicitly . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous T ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the lowpass value is set to initValue.

Compute

If enable is TRUE, the lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT / T.

Out

The lowpass value is returned.
