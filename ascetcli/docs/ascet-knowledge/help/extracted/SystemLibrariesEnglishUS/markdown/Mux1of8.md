# Mux1of8

| Column 1 | Column 2 |
| --- | --- |
|  | Mux1of8 switches between the eight inputs values s0,...,s7 on the binary representation of their index . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | b0 ::logical b1 ::logical b2 ::logical s0 ::continuous s1 ::continuous s2 ::continuous s3 ::continuous s4 ::continuous s5 ::continuous s6 ::continuous s7 ::continuous | continuous |

On activation of method

Out

The input value si(index i) is returned with i = b0 + 2*b1+ 4*b2, interpreting FALSE as 0 and TRUE as 1.
