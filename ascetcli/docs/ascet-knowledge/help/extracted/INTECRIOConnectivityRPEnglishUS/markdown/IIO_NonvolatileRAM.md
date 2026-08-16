# Non-Volatile RAM

A non-volatile (NV) variable is a variable which can be used like any other ASCET variable. Particularly, it can be written and read by the model, calibrated via a calibration window and measured/logged with the data acquisition. The special feature of an NV variable is that, in case of a simulation interruption, the current value of the NV variable is available when the simulation with the same model is restarted. This is especially useful for adaptive characteristics, commonly used inside the ECU code for self-learning algorithms, and storage of diagnostic results.

The optional attribute non-volatile (NV) is supported for all primitive data types of ASCET (scalars, arrays, matrices, characteristic lines/maps). Only ASCET variables can be configured for NVRAM; C code variables are not supported.

An NV variable can be created inside a class or module editor. This is done by activating the Non-volatile option in the properties editor of a variable.

| Column 1 |
| --- |
| WARNING |
| Wrongly initialized NVRAM variables can lead to unpredictable behavior of a vehicle or a test bench. This behavior can cause harm or property damage. Projects that use the NVRAM possibilities of the experimental targets expect a user-defined initialization that checks whether all NV variables are valid for the current project, both individually and in combination with other NV variables. If this is not the case, all NV variables have to be initialized with their (reasonable) default values. Due to the NVRAM saving concept, this is absolutely necessary when projects are used in environments where any harm to people and equipment can happen when unsuitable initialization values are used (e.g. in-vehicle-use or at test benches). |

See also

[NVRAM: Hardware Support](IIO_NVRAM_HardwareSupport.md)

[NV Variable Initialization and Update](IIO_NVVariable_InitializationUpdate.md)

[NVRAM: Data Consistency](IIO_NVRAM_DataConsistency.md)

[NVRAM Cockpit](IIO_NVRAMcockpit.md)

[NVRAM: Tips](IIO_NVRAMtips.md)
