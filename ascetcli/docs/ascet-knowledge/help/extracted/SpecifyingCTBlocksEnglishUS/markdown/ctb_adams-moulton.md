# Adams-Moulton

The Adams-Moulton integration method is also suitable for models without heavily varying eigenvalues. In contrast to the previous algorithms, the model should exhibit a smooth behavior. The cycle times for the Adams-Moulton and Heun algorithms are almost the same.

| Column 1 |
| --- |
| Mathematical Formula |
| Predictor: x(t+h)=x(t)+h/2(3f(x,t)-f(x,t-h)) (Adams-Bashforth) |
| Corrector: x(t+h)=x(t)+h/2(f(x,t)+f(x,t+h)) |
