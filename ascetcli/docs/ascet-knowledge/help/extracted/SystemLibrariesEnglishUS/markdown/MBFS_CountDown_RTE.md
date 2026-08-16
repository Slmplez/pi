# CountDownResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownResetTriggerEnabled returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV . The countdown is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the counter is not reset, the method returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV. If RT switches from FALSE to TRUE, the countdown is reset and the method returns TRUE if IV > 0 and FALSE is if IV < 0.
