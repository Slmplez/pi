# resetCTSolver( )

With resetCTSolver, the integration method can be reset explicitly:

resetCTSolver ( );

Use of the resetCTSolver library function is permitted only in the init, update, and stateEvents methods. resetContinuousState(x,y) is followed automatically by resetCTSolver().

See also

[Overview - Additional Library Functions](CTB_Overview_Additional_Library_Functions.md)

[getTime( )](CTB_getTime.md)

[getdT( )](CTB_getdT.md)

[getIntegrationStepsize( )](CTB_getIntegrationStepsize.md)

[resetContinuousState( state, new value)](CTB_resetContinuousState_state_newValue.md)
