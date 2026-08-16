# Timer

| Column 1 | Column 2 |
| --- | --- |
|  | Timer decrements the time counter by dT and signals when the time counter has reached zero. It is not retriggerable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startTime ::continuous | none |
| compute | none | none |
| out | none | logical |

On activation of method

Start

The time counter is set to startTime if the time counter value was previously less than or equal to zero.

Compute

The time counter is decremented by dT.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.
