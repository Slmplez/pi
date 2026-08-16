# Code Generation and Experimenting with Projects

The code generation and experimentation facilities are much more powerful for projects than for components. Only offline experimentation with floating-point arithmetic (build option Physical Experiment, see [Build Node](Build_Options.md)) is available for components. Projects offer online experimentation, and both offline and online experimentation can be combined with either floating-point arithmetic or quantized floating-point arithmetic (build option Quantized Physical Experiment) or fixed-point arithmetic (build option Implementation Experiment). The same code generation facilities are available for components, when they are experimented with in a project context.

By default, the generated code is stored in the ASCET database/workspace. However, you can activate external code storage, i.e. the generated code is stored on the Windows file system.

For ASCET-SE targets, you can link existing object files to an executable file without new code generation and compilation. This is primarily of interest when your project contains external C code files which are integrated during the make process.

See also

[Online and Offline Experimentation](PE_online_offline.md)

[Experimenting with Quantized Floating Point Code](experiment_quantized.md)

[Build Node](Build_Options.md)

[External Code Storage](PE_ExternalCodeStorage.md)

You can

[Generate Code](PE_generatecode.md)

[Generate Executable Code](generateexecutable.md)

[Link Object Files to an Executable File](linkobjects.md)
