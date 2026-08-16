# Implementation for: +/- Window

The Implementation for: +/- window contains the following elements:

Overflow Handling field

Displays the way an overflow is handled.

- Reduce Resolution option

Avoids overflow by shifting both inputs to the right. The shift is determined automatically.

- Keep Resolution And Limit option

Does not perform a shift and uses mathematical service routines with clipping if available.

- Keep Resolution And Don't Limit option

Does not perform a shift and uses normal arithmetic, thus allowing overflow to occur. This variant is used for counters which should overflow cyclically, for example.

Select Quantization combo box

Shows the selected quantization. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Auto | Selects a quantization using an optimization strategy. |
| 1 | Selects quantization and data type of the first input. |
| 2 | Selects quantization and data type of the second input. |

![](BUTTON.GIF) Cancel

Closes the window.

All other elements are irrelevant for the implementation of an addition or subtraction.
