# IntegratorT

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorT is a time discrete integrator with time constant T. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator(new) = integrator(old) + in * dT / T.

Out

The integrator value is returned.
