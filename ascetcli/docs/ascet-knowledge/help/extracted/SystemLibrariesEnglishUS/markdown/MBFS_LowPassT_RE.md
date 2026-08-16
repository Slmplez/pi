# LowPassTResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassTResetEnabled performs a discrete-time first-order low-pass filter with time constant T . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | T :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + dT/T *(u-x) is buffered. If reset is enabled, x = IV is buffered.

y

returns the value x.
