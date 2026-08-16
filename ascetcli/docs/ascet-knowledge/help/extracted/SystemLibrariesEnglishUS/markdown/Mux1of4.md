# Mux1of4

| Column 1 | Column 2 |
| --- | --- |
|  | Mux1of4 switches between the four inputs values s0,...,s3 on the binary representation of their index. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | b0 ::logical b1 ::logical s0 ::continuous s1 ::continuous s2 ::continuous s3 ::continuous | continuous |

On activation of method

Out

The input value si (index i) is returned with i = b0 + 2*b1, interpreting FALSE as 0 and TRUE as 1.
