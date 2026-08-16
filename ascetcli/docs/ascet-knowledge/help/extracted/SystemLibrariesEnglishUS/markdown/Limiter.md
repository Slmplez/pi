# Limiter

| Column 1 | Column 2 |
| --- | --- |
|  | Limiter returns the input x limited by mn and mx . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous mn ::continuous mx ::continuous | continuous |

On activation of method

Out

The input x is limited by mn and mx and is returned, i.emax(min(x, mx), mn). There is no check if mn <= mx.
