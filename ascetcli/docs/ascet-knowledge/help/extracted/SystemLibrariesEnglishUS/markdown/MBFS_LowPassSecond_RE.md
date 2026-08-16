# LowPassSecondOrderResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassSecondOrderResetEnabled performs a discrete-time second-order low-pass filter with time constant T and damping factor D (PT2). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV1 ::continuous |  |
|  | IV2 ::continuous |  |
|  | D :: continuous |  |
|  | T :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x1 = x2 + (pow(dT, 2)*(u - x2))/temp1 + pow(T,2)*(x2 - temp)/temp1 is buffered. If reset is enabled, x1 = IV1 is buffered.

y

returns the value x1.
