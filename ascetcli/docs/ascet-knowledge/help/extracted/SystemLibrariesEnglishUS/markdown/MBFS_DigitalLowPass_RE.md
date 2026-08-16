# DigitalLowPassResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DigitalLowPassResetEnabled performs a discrete time first order lowpass with linear approximation. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | m :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + m*(u - x) is buffered.

If reset is enabled, x = IV is buffered.

y

returns the value x.
