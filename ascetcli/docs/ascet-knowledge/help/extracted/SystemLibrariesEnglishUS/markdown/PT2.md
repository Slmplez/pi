# PT2

| Column 1 | Column 2 |
| --- | --- |
|  | PT2 is a time discrete delay function with time constant T, gain constant K, and damping d |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous d ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The two integrator values are set to initValue.

Compute

The value of the PT2-function is computed via two I-functions in row, which are backcoupled by a cascade of two P-functions.

Out

The value of the PT2-function is returned.
