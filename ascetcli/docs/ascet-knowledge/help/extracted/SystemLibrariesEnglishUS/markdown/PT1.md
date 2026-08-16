# PT1

| Column 1 | Column 2 |
| --- | --- |
|  | PT1 is a time discrete low pass with time constant T and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The value of the integrator is set to initValue.

Compute

The value of the PT1-function is computed via an I-function and a P-function which is backcoupled.

Out

The value of the PT1-function is returned.
