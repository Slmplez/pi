# TimerRetriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerEnabled decrements the time counter by dT and signals when the time counter has reached zero. It can be retriggered and must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | enable ::logical in ::logical startValue ::continuous | none |
| out | none | logical |

On activation of method

Compute

If enable is TRUE and in has a rising edge, the timer is started, i.e. its counter value is set to the start value. Otherwise, the time counter is decremented by dT (the time frame). If enable is FALSE, nothing happens.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.
