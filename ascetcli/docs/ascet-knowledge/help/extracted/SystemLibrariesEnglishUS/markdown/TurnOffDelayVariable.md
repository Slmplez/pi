# TurnOffDelayVariable

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelay delays a falling edge of the input signal. The duration of the delay can be modified at runtime via the Time variable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A falling edge of the input signal is delayed. If the signal flips from TRUE to FALSE, a timer is started. On being FALSE the timer is incremented by dT and is compared to delayTime. If the input signal is TRUE, the timer is reset.

Out

TRUE is returned if the input signal is TRUE or the timer has not exceeded delayTime. Otherwise, FALSE is returned.
