# Implementation for: / Window

This window contains the following functions:

Overflow Handling field

Displays the way an overflow is handled.

- Reduce Resolution option

Avoids overflow by shifting both inputs to the right. The shift is determined automatically.

- Keep Resolution And Limit option

Does not perform a shift and uses mathematical service routines if available.

- Keep Resolution And Don't Limit option

Does not perform a shift and uses normal arithmetic, thus allowing overflow to occur.

The Allow zero in phys. interval option could be activated when the generated code should not test for division by zero, even though the denominator interval includes zero. Therefore, option is an assurance to the code generator that the user himself will take care that the denominator does not assume the value zero.

Wrong usage of this option can lead to severe exception errors in the control unit.

##### Pre-shift:

Indicates if the numerator should be maximized automatically by left shift to improve numerical accuracy. The following settings can occur:

- Auto left-shifts the numerator automatically.
- When Auto is deactivated, the pre-shift is performed according to the settings in the Pre Shift field.

Line 1 determines the shift for the first operand (-31 to 31).

Line 2 determines the shift for the second operand (-31 to 31).
