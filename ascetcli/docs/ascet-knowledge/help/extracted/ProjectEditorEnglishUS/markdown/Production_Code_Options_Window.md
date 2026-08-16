# Production Code Node

These options are only available when ASCET-SE is installed, and a respective target is selected in the [Build node](Build_Options.md).

##### Generate Data Structures

Determines whether data structures are generated.

| Column 1 | Column 2 |
| --- | --- |
| Use Component Settings | Default setting. Data structure generation is determined by the setting in the selected implementation of each included component. |
| Yes for All Components | Data structures are generated for all components in the project. Overrides component settings. |
| No for All Components | No data structures are generated for any component in the project. Overrides component settings. |

##### Generate OS Configuration

Switches the generation of the conf.c file on (activated; default) or off (deactivated). This file contains the entire code for the OS configuration.

When the option is deactivated, no operating system configuration is generated; neither in the conf.c file nor in the project file. When you start an offline or online experiment while the option is deactivated, the following error message is displayed.

Conf.c generation must be active for experiment. Please switch 'generate OS configuration' to 'yes' in the code generation options.

##### Generate Map File

Can be deactivated to suppress the automatic generation of a special map file after the code has been generated. This map file is required for the ASAM-MCD-2MC generation.

##### Add Implementation Definitions

Can be activated to include comments with additional information regarding implementations in the generated code.

##### Generate Access Methods for dT (Alternative: use OS dT directly)

specifies how the global variable dT provided by the operating system is to be used. If this option is deactivated, dT is taken directly from the operating system. The implementation of dT then cannot be modified. If this option is activated, dT is evaluated through a method invocation.

This allows using a customized implementation for dT in the model. In any case, for the respective task one of the options monitoring or dT only must be set in the pre/post-hooks menu of the OS editor, if dT is to be used in the model.

See also

[Build Node](Build_Options.md)
