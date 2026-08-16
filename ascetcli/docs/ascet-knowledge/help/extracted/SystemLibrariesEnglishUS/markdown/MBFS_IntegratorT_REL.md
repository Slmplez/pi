# IntegratorTResetEnabledLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTResetEnabledLimited is a time discrete integrator with gain 1/T . The integrated value and therefore the output y are limited by the inputs MX and MN (y is element of [MN,MX]). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| B_max |  | logical |
| B_min |  | logical |
| compute | MN :: continuous |  |
|  | MX :: continuous |  |
|  | T ::continuous |  |
|  | u ::continuous |  |
| y |  | continuous |

On activation of method

B_max or

If y was set to the upper limit Mx, TRUE is returned. Otherwise, FALSE is returned.

B_min

If y was set to the lower limit Mn, TRUE is returned. Otherwise, FALSE is returned.

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the integration is performed: integrator(new) = integrator (old) + u * dT * 1/T. The result, stored in the variable y, is limited by the inputs MX and MN (--> Limiter) and returned.

If reset is enabled, y is set to the initial value IV.

y

The value stored in y is returned.
