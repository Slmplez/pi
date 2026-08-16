# NV Variable Initialization and Update

##### Starting the simulation:

After the model code was downloaded to the target, NV variables are initialized with their default values if no matching data are available in the NVRAM. No matching data means that the NV memory is empty, inconsistent (verified via a checksum) or the NV data does not match with the downloaded model (verification via [NV identifier](IIO_NVRAM_HardwareSupport.md#NVidentifier)).

In case matching data is available in the NV memory, the variables are initialized accordingly before the experiment can be started (Start OS).

##### Stopping the simulation:

When the simulation is stopped (Stop OS), the most recently saved values of the NV variables are persistently stored inside the NVRAM. Even if the target is powered off or if the code is downloaded again, the simulation can proceed with the most recently saved values of the NV variables.

As mentioned before, the NV variables are periodically saved to the NVRAM in auto-update mode. To make sure that the current values - not the values from the last cyclic update - are available in the NVRAM, the API function

void nvramUpdateMemoryExit(void)

should be called at the end of the Exit task (task with application mode inactive).

If there are no NV variables inside the current model, the NVRAM content remains unchanged.

##### Model with NV variables inside the FLASH memory:

A simulation model with NV variables inside the FLASH memory of the simulation controller is booted when power on occurs. The potential matching NV data is used for initializing the NV variables before starting the simulation.

##### Display whether model is running on default NV variable values:

Whether the model is running on default NV variable values (as specified in the ASCET data editor), or whether the variables are initialized out of the NVRAM, can be determined in two ways. In the experiment environment, an info message is written in the Target Debugger window. From within the model, the API function

uint8 nvramCheckForInitializedVars(void)

provides the same information.

##### Clearing the NVRAM content:

To prevent the initialization of a model with the NV content (if the program identifier is matching), it is possible to clear the NV memory content. This enforces the initialization of the NV variables with their default values. This feature is currently not supported by the GUI. However, the API function

uint32 nvramClear(void)

allows to reset the NVRAM from within the model (see [nvramClear](IIO_nvramClear.md)).

See also

[NVRAM Safety Information](IIO_NVRAMSafetyInformation.md)

[NVRAM: Hardware Support](IIO_NVRAM_HardwareSupport.md)

[Non-Volatile RAM](IIO_NonvolatileRAM.md)

[API Functions - NVRAM](IIO_APIfunctionsNVRAM.md)
