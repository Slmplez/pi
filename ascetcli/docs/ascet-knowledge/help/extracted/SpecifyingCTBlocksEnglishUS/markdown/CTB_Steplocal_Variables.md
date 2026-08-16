# Steplocal Variables

![](button_steplocal.gif)

Steplocal variables are used to store intermediate values during the calculation of an evaluation step. These variables are visible in all block methods. The value of a steplocal variable is valid only in one evaluation cycle, the variable is reinitialized at the beginning of each iteration step. If the value must be evaluated in a different method, the execution sequence of the methods has to be considered (ensure writing before reading).
