# void resetCTSolver(CTSimExperiment *)

The integration algorithm can be reset explicitly with the resetCTSolver routine. An example for its use is resetting a continuous time state:

x = 0.0;

resetCTSolver (CTBlock);

Whenever one or more continuous time states have been set explicitly, the internal structures need to be reset when finished. Note that the resetCTSolver command should always be issued after a value has been assigned to a continuous time state.

See also

[Overview - Additional C Routines](CTB_Overview_Additional_C_Routines.md)

[real64 getTime(CTSimExperiment *)](CTB_real64_getTime_CTSimExperiment.md)

[real64 getdT ()](CTB_real64_getdT.md)

[real64 getIntegrationStepsize(CTSimExperiment *)](CTB_real64_getIntegrationStepsize_CTSimExperiment.md)

[int_32 sizeU (CTSimExperiment *)](CTB_int_32_sizeU_CTSimExperiment.md)

[int_32 sizeY (CTSimExperiment *)](CTB_int_32_sizeY_CTSimExperiment.md)

[int_32 sizeV (CTSimExperiment *)](CTB_int_32_sizeV_CTSimExperiment.md)

[int_32 sizeX (CTSimExperiment *)](CTB_int_32_sizeX_CTSimExperiment.md)

[int_32 sizeXK (CTSimExperiment *)](CTB_int_32_sizeXK_CTSimExperiment.md)
