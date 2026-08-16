# Overview - Additional C Routines

Additional C routines are available for modeling in C. For generic use of these routines, the internal data structure of the current block must be specified in the routine's interface. The CTBlock and self methods are visible in each method.

The following routines are provided:

- getTime
- getdT
- getIntegrationStepsize
- resetCTSolver
- sizeU
- sizeY
- sizeV
- sizeX
- sizeXK

The get and reset routines provide additional ESDL library routines; the size routine allows a generic model design if the number or array size of instance variables has to be changed.

The following describes the use of the additional C routines in more detail. There are no semantic checks and usage restrictions provided with these routines. It is the user's responsibility to ensure they are used correctly.

See also

[Overview - Modeling in C](CTB_Overview_Modeling_in_C.md)

[real64 getTime(CTSimExperiment *)](CTB_real64_getTime_CTSimExperiment.md)

[real64 getdT ()](CTB_real64_getdT.md)

[real64 getIntegrationStepsize(CTSimExperiment *)](CTB_real64_getIntegrationStepsize_CTSimExperiment.md)

[void resetCTSolver(CTSimExperiment *)](CTB_void_resetCTSolver_CTSimExperiment.md)

[int_32 sizeU (CTSimExperiment *)](CTB_int_32_sizeU_CTSimExperiment.md)

[int_32 sizeY (CTSimExperiment *)](CTB_int_32_sizeY_CTSimExperiment.md)

[int_32 sizeV (CTSimExperiment *)](CTB_int_32_sizeV_CTSimExperiment.md)

[int_32 sizeX (CTSimExperiment *)](CTB_int_32_sizeX_CTSimExperiment.md)

[int_32 sizeXK (CTSimExperiment *)](CTB_int_32_sizeXK_CTSimExperiment.md)
