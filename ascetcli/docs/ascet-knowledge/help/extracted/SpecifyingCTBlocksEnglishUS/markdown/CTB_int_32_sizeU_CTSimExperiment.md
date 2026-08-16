# int_32 sizeU (CTSimExperiment *)

The sizeU function returns the number of block inputs:

sizeU = sizeU (CTBlock);

If some of the inputs are arrays, the total number of the scalar elements is returned. More complex inputs, such as records, structures or classes, are counted as one element.

See also

[Overview - Additional C Routines](CTB_Overview_Additional_C_Routines.md)

[real64 getTime(CTSimExperiment *)](CTB_real64_getTime_CTSimExperiment.md)

[real64 getdT ()](CTB_real64_getdT.md)

[real64 getIntegrationStepsize(CTSimExperiment *)](CTB_real64_getIntegrationStepsize_CTSimExperiment.md)

[void resetCTSolver(CTSimExperiment *)](CTB_void_resetCTSolver_CTSimExperiment.md)

[int_32 sizeY (CTSimExperiment *)](CTB_int_32_sizeY_CTSimExperiment.md)

[int_32 sizeV (CTSimExperiment *)](CTB_int_32_sizeV_CTSimExperiment.md)

[int_32 sizeX (CTSimExperiment *)](CTB_int_32_sizeX_CTSimExperiment.md)

[int_32 sizeXK (CTSimExperiment *)](CTB_int_32_sizeXK_CTSimExperiment.md)
