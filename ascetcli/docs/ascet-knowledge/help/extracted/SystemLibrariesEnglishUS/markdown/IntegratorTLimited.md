# IntegratorTLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTLimited is a time discrete integrator with time constant T. Its integrator value can be limited . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator(new) = integrator(old) + in * dT / T (limited by mn and mx).

Out

The integrator value is returned.
