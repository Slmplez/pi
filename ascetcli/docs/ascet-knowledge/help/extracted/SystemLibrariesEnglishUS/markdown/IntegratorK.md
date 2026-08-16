# IntegratorK

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorK is a time discrete integrator with gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator (new) = integrator (old) + in * dT*K.

Out

The integrator value is returned.
