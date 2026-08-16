# IntegratorTEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTEnabled is a time discrete integrator with time constant T. It must be enabled explicitly and its integrator value can be limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous T ::continuous mn ::continuous mx ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the integrator value is set to initValue.

Compute

If enable is TRUE, the integrator value is computed via integrator(new) = integrator(old) + in * dT / T (limited by mn and mx).

Out

The integrator value is returned.
