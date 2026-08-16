# NVRAM: Data Consistency

When the simulation is interrupted by power off or a system crash, the NVRAM contains values of the NV variables. The relevance of these values depends on the time of the last automatically or manually (from within the model) triggered saving.

To guarantee the consistency of the NVRAM content in case of an unexpected termination of the simulation, different strategies can be used as introduced below.

The consistency level can be set with the following API function:

uint32 nvramSetConsistencyLevel(T_consistencyLevel level)

##### No consistency:

The NVRAM update is done without respect to consistency within NV variables and between individual NV variables.

##### Low level consistency (single variables):

Low-level consistency means that the data consistency within NV variables (scalars, arrays and matrices, but not characteristic lines/maps) is guaranteed.

It must be noted here that the update of characteristic lines/maps cannot be done atomically (in the sense of low-level consistency)

##### High level consistency (among variables, after task completion):

High-level consistency means that all NV variables are updated in the idle task, without interruption by the model.

The update for a set of NV variables should be atomic. A self-learning algorithm, for example, works on several variables, and it must be guaranteed that data for different variables in the NVRAM come from the same calculation cycle.

##### Model-controlled consistency (among variables and over multiple tasks cycles):

The high-level consistency mechanism guarantees consistency only if manipulations of NV variables are done within one task cycle. There may be cases where this manipulation lasts several task cycles (e.g. the update of an adaptive characteristic, done in several tasks). The ES1135 / ES910 / RTPRO-PC firmware cannot be aware of this, and therefore the model must control the NVRAM update.

For this purpose, the automatic update can be disabled by the following function:

uint32 nvramDisableAutoUpdate(void)

The manual update of the complete set of NV variables can be started with this command:

uint32 nvramManualUpdateBackground(void)

Even the manual update it is not allowed to block the whole system, and thus change the real-time behavior, until the update is finished. Therefore, the function for manual update returns immediately and the update is done in the background.

The model can poll the status of the manual update with the following function:

uint8 nvramCheckRunningUpdate(void)

The function returns true if the update is running. The user, or the model, is responsible that the NV variables are not modified during the update.

The manual update mode can be disabled with

uint32 nvramEnableAutoUpdate(void)

A selective update of NV variables is not supported.

If there are no NV variables inside the current model, the NVRAM content remains unchanged.

##### Defective NVRAM content:

In case of defective NVRAM content, e.g. if the checksum test failed, the user is warned. This is done textually in the experiment environment (or the ASCET monitor window).

See also

[NVRAM Safety Information](IIO_NVRAMSafetyInformation.md)

[Non-Volatile RAM](IIO_NonvolatileRAM.md)

[API Functions - NVRAM](IIO_APIfunctionsNVRAM.md)
