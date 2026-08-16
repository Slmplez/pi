# TurnOffDelayTime

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelayTime delays a falling edge of the input signal by the time T , if the input signal remains FALSE for minimum the whole period T . The relationship between the time delay t and the number of delay samples n is |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | T:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE or the number of delay samples n = T : dT has not yet been counted down to ≤ 0.

FALSE is returned if u = FALSE and the number of delay samples n = T : dT has been counted down to ≤ 0.
