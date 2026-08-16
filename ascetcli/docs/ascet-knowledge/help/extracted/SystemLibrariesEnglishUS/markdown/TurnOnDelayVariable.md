# TurnOnDelayVariable

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelayVariable delays a rising edge of the input signal. The duration of the delay can be modified at runtime via the Time variable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A rising edge of the input signal is delayed. If the signal flips from FALSE to TRUE, a timer is started. On being TRUE the timer is incremented by dT and is compared to delayTime. If the input signal is FALSE, the timer is reset.

Out

FALSE is returned if the input signal is FALSE, or the timer has not exceeded delayTime. Otherwise, TRUE is returned.
