# AccumulatorResetEnabledLimited

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorResetEnabledLimited : The output y is the limited sum of all input values u . If the accumulator is reset, IV is the initial value of the sum. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| B_max |  | logical |
| B_min |  | logical |
| compute | MN :: continuous |  |
|  | MX :: continuous |  |
|  | u ::continuous |  |
| y |  | continuous |

On activation of method

B_max

If y was set to the upper limit MX, TRUE is returned. Otherwise, FALSE is returned.

B_min

If y was set to the lower limit MN, TRUE is returned. Otherwise, FALSE is returned.

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the sum of all input values u, limited by MX and MN (--> Limiter), stored in y, is returned.

If reset is enabled, y is set to the initial value IV.

y

The value stored in y is returned.
