# Overview – Integration Methods

It is assumed that the differential equation exists in its state form:

x’(t) = f(x,t); with x(t=0) = x0

The table below lists some characteristics of the implemented integration methods:

- The global error order p of the discretion error that is proportional with hp, where h is the integration step size.
- The number of function evaluations per integration step. Each time, the local variables are reset and the nondirectOutputs, directOutputs, derivatives methods are executed. This, combined with the integration step size, can be used to estimate the speed of the method.
- Single-step/multi-step methods (SSM/MSM): Single-step methods only use the last estimated value for the next step, whereas multi-step methods take the last n estimates into account.
- A predictor-corrector method (P-C) first uses an integration method to calculate an estimate which is then corrected using a second method.
- Fixed or variable step size.

The table below contains a summary of these characteristics for integration methods with fixed step size (for MSM, the time when the function is computed or when the break points are taken into account is indicated in parentheses).

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- |
| Integration Method | Error Order | Function Evaluations/ Step | SSM/MSM | P-K | Step Size |
| Euler | 1 | 1(t) | SSM | no | fixed |
| Mulstep 2 | 2 | 1(t) | MSM (t-h, t) | no | fixed |
| Heun | 2 | 2 (t, t+h) | SSM | yes | fixed |
| Adams-Moulton | 2 | 2 (t, t+h) | MSM(t-h, t) | yes | fixed |
| Runge-Kutta 4 | 4 | 4 (t, t+h/2, t+h/2, t+h) | SSM | no | fixed |

To ensure that the integration methods can be applied in real-time, each method is implemented using relatively few function evaluations per integration step and a correspondingly low error order.

See also

[Euler](ctb_euler.md)

[Mulstep](ctb_mulstep.md)

[Heun](ctb_heun.md)

[Adams-Moulton](ctb_adams-moulton.md)

[Runge-Kutta 4](ctb_runge-kutta_4.md)

[Integration Methods With Variable Step Width](ctb_integration_methods_with_variable_step_width.md)
