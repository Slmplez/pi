# TurnOnDelaySample

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelaySample : A rising edge at time t = i * dT of the input signal u is delayed by n block evaluations (samples). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | n:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE and the number of block evaluations n has been counted down to ≤ 0.

FALSE is returned if u = FALSE or the number of block evaluations n has not yet been counted down to ≤ 0.
