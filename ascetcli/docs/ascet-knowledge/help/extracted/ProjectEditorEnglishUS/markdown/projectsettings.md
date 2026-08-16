# Project Settings

ASCET code generation is available for different target platforms, e.g. PC, experimental targets and microcontroller targets. For each project and target, a number of build, experiment code or production code options are available, as well as optimization options and ASAM-MCD-2MC generation options.

For an ASCET module, code can be generated and simulated without project context only with the Physical Experiment code generator (see [Build Node](Build_Options.md)). For the other code generators the module must be integrated into a project. A so-called default project can be defined for each class or module for that purpose. This is the only way to access the implementation information. Without project context, the conversion formulas as well as all implementations of imported entities are missing.

See also

[Adjusting the Project Settings](adjustcode_gen.md)

[Project Properties Window](PE_Settings_for_Window.md)

[Build Node](Build_Options.md)

[ASAM-2MC Node](ASAM-2MC_Tab.md)
