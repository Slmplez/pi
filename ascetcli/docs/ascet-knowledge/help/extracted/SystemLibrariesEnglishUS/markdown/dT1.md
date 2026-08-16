# DT1

| Column 1 | Column 2 |
| --- | --- |
|  | dT1 is a time discrete differentiation transfer function with time constant T and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The differentiation value is set to initValue.

Compute

The differentiation value is computed via a P-function and an I-function which is backcoupled.

Out

The differentiation value is returned.
