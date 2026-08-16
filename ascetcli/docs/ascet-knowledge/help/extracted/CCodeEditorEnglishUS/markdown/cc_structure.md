# Structure

A component described with C code has the same structure as if it was described with ESDL or as a block diagram. The C code describes the body of methods or processes. Each code variant is stored separately.

The specification of a component in C code depends on:

- The target, e.g. whether the C code is for the PC, PPC or for a specific controller CPU. Here the code can vary, since, for instance, a controller CPU has special registers that have to be addressed directly, or the endian format is different.
- The specification level. The C code can be intended to represent the physical level. In that case the implementation level coincides with the physical level as far as possible, e.g. the type continuous is represented as a 64-bit float. Alternatively the C code can be on the implementation level of fixed point arithmetic.
- The chosen implementation, if the C code is on the implementation level, since the C code depends on the implementations of the variables, particularly on their quantizations.

See also

[Using the C Code Editor](CC_using_CCode_component.md)

[Methods and Processes](cc_methods_and_processes.md)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Header](CC_Header.md)
