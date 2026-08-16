# Heun

The Heun integration method is used for models without heavily varying eigenvalues. The cycle time is twice as long as with the Euler method.

| Column 1 |
| --- |
| Mathematical Formula |
| Predictor: x(t+h)=x(t)+h*f(x,t) (Euler) |
| Corrector: x(t+h)=x(t)+h/2*(f(x,t)+f(x,t+h)) |
