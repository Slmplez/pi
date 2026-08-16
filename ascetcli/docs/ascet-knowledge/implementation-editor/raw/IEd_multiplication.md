# Implementation for: * Window

This window contains the following functions:

Overflow Handling field

Displays the way an overflow is handled.

- Reduce Resolution option

Avoids overflow by shifting both inputs to the right. The shift is determined automatically.

- Keep Resolution And Limit option

Does not perform a shift and uses mathematical service routines with clipping if available.

- Keep Resolution And Don't Limit option

Does not perform a shift and uses normal arithmetic, thus allowing overflow to occur. This variant is used for counters which should overflow cyclically, for example.

##### Pre-shift:

Both operands can be shifted before the operation to avoid an overflow and to re-scale each operand in a numerically meaningful way. The pre-shift can also allow full use of the value range. Integer numbers between -31 and 31 are possible for either operand. A positive number indicates left shift, negative indicates right shift. Zero means no shift at all. The following settings can occur:

- The activated Auto option indicates no pre-shift.
- When Auto is deactivated, the pre-shift is performed according to the settings in the Pre Shift field.

Line 1 determines the shift for the first operand (-31 to 31).

Line 2 determines the shift for the second operand (-31 to 31).
