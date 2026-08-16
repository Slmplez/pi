# TurnOnDelayTime

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelayTime delays a rising edge of the input signal by the Time T , if the input signal remains high (TRUE) for minimum this period T . The relationship between the time delay t and the number of delay samples n is |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | T:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE and the number of block evaluations n = T : dT has been counted down to ≤ 0.

FALSE is returned if u = FALSE or the number of block evaluations n = T : dT has not yet been counted down to ≤ 0.
