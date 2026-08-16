# PIDLimited

| Column 1 | Column 2 |
| --- | --- |
|  | PIDLimited is a time discrete proportional integrator with differential part with time constants Tv and Tn and gain constant K. The value of the integrator is limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous Tv ::continuous Tn ::continuous K ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PID-function is computed as a sum of a P-function, a D-function and an I-function, where the integrator value of the I-function is limited by mn and mx.

Out

The value of the PID-function is returned.
