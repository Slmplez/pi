# PILimited

| Column 1 | Column 2 |
| --- | --- |
|  | PILimited is a time discrete proportional integrator with time constant T and gain constant K. The value of the integrator is limited |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PI-function is computed as the sum of a P-function and an I-function, where the integrator value of the I-function is limited by mn and mx.

Out

The value of the PI-function is returned.
