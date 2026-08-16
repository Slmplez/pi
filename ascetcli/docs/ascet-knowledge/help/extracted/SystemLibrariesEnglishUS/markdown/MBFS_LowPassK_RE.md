# LowPassKResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassKResetEnabled performs a discrete-time first-order low-pass filter with time constant 1/K . The Laplace notation is G(s) = K / (s+K). The relationship between the analogue cut-off frequency (f c ) and K is f c = K / (2 * p ). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | K :: continuous |  |
|  | u :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | IV :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + K*dT*(u-x) is buffered. If reset is enabled, x = IV is buffered.

y

returns the value x.
