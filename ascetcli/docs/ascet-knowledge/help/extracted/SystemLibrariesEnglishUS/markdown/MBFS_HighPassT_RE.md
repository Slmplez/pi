# HighPassTResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | HighPassTResetEnabled performs a discrete-time first-order high-pass filter with the continuous-time Laplace notation G(s) = (TD * s) / (1 + T * s) The relationship between the analogue cut-off-frequency (f c ) and T is f c = 1 / (2* p *T) |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | T :: continuous |  |
|  | TD :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x1 = x1 + (TD*u - TD*x2 - dT*x1)/T is buffered. If reset is enabled, x1 = IV is buffered.

y

returns the value x1.
