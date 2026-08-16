# TimerRetrigger

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetrigger decrements the time counter by dT and signals when the time counter has reached zero. It can be retriggered |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startTime ::continuous | none |
| compute | none | none |
| out | none | logical |

On activation of method

Start

The time counter is set to the start value.

Compute

The time counter is decremented by dT.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.
