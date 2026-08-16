# DigitalLowpass

| Column 1 | Column 2 |
| --- | --- |
|  | DigitalLowpass recursively computes the mean value of the input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous m ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The mean value is set to initValue.

Compute

The mean value is computed via mean value (new) = mean value (old) + m *(in -mean value (old) ).

Out

The mean value is returned.
