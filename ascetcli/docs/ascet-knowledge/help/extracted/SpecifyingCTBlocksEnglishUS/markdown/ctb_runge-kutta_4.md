# Runge-Kutta 4

The Runge-Kutta integration method is best suited for models without heavily varying eigenvalues. This integration method is very robust for this type of model. It is the slowest, but also the most accurate method at comparable step sizes. It is therefore possible to increase the step size considerably.

| Column 1 |
| --- |
| Mathematical Formula |
| x(t+h)=x(t)+h/6(K1+2K2+2K3+K4) |
| where |
| K1 = f(x,t) |
| K2 = f(x + K1*h/2, t + h/2) |
| K3 = f(x + K2*h/2, t + h/2) |
| K4 = f(x + K3*h, t + h) |
