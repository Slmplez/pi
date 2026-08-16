# NVRAM Safety Information

The following experimental targets offer NVRAM possibilities:

- ES1135
- ES910
- RTPRO-PC

| Column 1 |
| --- |
| WARNING |
| Wrongly initialized NVRAM variables can lead to unpredictable behavior of a vehicle or a test bench. This behavior can cause harm or property damage. Projects that use the NVRAM possibilities of the experimental targets expect a user-defined initialization that checks whether all NV variables are valid for the current project, both individually and in combination with other NV variables. If this is not the case, all NV variables have to be initialized with their (reasonable) default values. Due to the NVRAM saving concept, this is absolutely necessary when projects are used in environments where any harm to people and equipment can happen when unsuitable initialization values are used (e.g. in-vehicle-use or at test benches). |

See also

[Non-Volatile RAM](IIO_NonvolatileRAM.md)
