# StopWatchEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchEnabled increments the time counter by one dT. This timer must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical | none |
| compute | enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the time internal counter is set to zero.

Compute

If enable is TRUE, the time counter is increment by dT.

out

The time counter value, i.e. the time elapsed since the last start and while enabled was TRUE is returned.
