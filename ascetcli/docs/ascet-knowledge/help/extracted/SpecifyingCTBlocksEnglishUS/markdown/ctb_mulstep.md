# Mulstep

The Mulstep integration method is a multi-step method which is used for models without heavily varying eigenvalues. The cycle time of one integration step is only slightly higher than for the Euler method since only one function evaluation is performed per integration step. However, the error order is 2.

| Column 1 |
| --- |
| Mathematical Formula |
| x(t+h)=x(t)+h(3/2*f(x,t)-1/2f(x,t-h)) |
