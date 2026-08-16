# SampleAndHoldResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | SampleAndHoldResetEnabled is a memory block with enable and reset ports. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| y | none | continuous |

On activation of method

SampleAndHoldResetEnabled

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the value u is buffered. If reset is enabled, the value IV is buffered.

y

returns the buffered value x.
