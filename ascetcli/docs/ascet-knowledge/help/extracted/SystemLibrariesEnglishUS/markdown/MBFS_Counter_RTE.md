# CounterResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CounterResetTriggerEnabled counts up and outputs the number of block evaluations since the last reset. The counter is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | continuous |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the counter is not reset, the method returns the number of block evaluations since the last reset. If RT switches from FALSE to TRUE, the counter is reset and the initial value IV is returned.
