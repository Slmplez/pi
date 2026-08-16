# MeanValueTResetEnabled and MeanValueT_RE_ESDL

| Column 1 | Column 2 |
| --- | --- |
|  | MeanValueTResetEnabled returns the mean value of the array x with length k . The array x stores the last k input values u . k is an internal constant and cannot be changed during runtime. Reset can be performed at any time. If you change the value of k , you must change the size of array x as well. MeanValueT_RE_ESDL is an ESDL version of the same functionality. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, then the mean value of the array (i.e. of the last k input values u) is buffered.

If reset is enabled (i.e. R =TRUE), then each element of the array is set to IV and the mean is buffered, which is IV.

y

Returns the buffered mean value.
