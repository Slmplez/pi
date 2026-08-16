# TimerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerEnabled decrements the time counter by dT and signals when the time counter has reached zero. It is must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| Compute | enable ::logical in ::logical startTime ::continuous | none |
| Out | none | logical |

On activation of method

Compute

If enable is TRUE, in has a rising edge and the time counter value is less or equal to zero, the timer is started,i.e. its counter value is set to the start time. Otherwise, the time counter is decremented by dT. If enable is FALSE, nothing happens.

Out

TRUE is returned, if the time counter is greater than zero. Otherwise, FALSE is returned.
