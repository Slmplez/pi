# resetContinuousState( state, new value)

Modeling time- or state-dependent discontinuities often requires resetting the continuous state variable. To ensure a correct numeric evaluation, the integration method needs to be reinitialized internally. This is done using the resetContinuousState function:

resetContinuousState (x, 0.0 );

In this case, the state x is set to 0.0 and, if necessary, the integration method is reinitialized. Use of the resetContinuousState library function is permitted only in the init, and stateEvents methods. resetContinuousState(x,y) is followed automatically by resetCTSolver().

See also

[Overview - Additional Library Functions](CTB_Overview_Additional_Library_Functions.md)

[getTime( )](CTB_getTime.md)

[getdT( )](CTB_getdT.md)

[getIntegrationStepsize( )](CTB_getIntegrationStepsize.md)

[resetCTSolver( )](CTB_resetCTSolver.md)
