# Constants and System Constants

Constants store values that can only be read from inside the model. In contrast to parameters, constants cannot be changed from outside the model but are fixed at specification time. Constants cannot be implemented, either.

Constants are created as a define statement in the generated C code. However, they are not necessarily explicitly visible in the generated code. If, e.g., the constant is set against a requantization, the constant does not explicitly appear.

System constants are used like constants, and also created as define statements. Unlike constants, system constants can be implemented. They are always explicitly visible in the generated code. You can use the Resolve System Constants option in the ASCET options window, Targets\<target>\Build node, to determine when system constants are resolved. The following selections are available for each target:

| Column 1 | Column 2 |
| --- | --- |
| Generation Time | The system constant behaves like a literal, i.e. can be used by the code generation for optimization. |
| Compile Time | The system constants are generated as C code macros (via #define statements) and can be used by the compiler for optimizations. |
| Run Time | The system constants behaves like a parameter, i.e. there is a memory address where the value of the system constant can be read from during run time. In an experiment, you can calibrate the system constant. |

System constants can be converted into normal constants using Extras menu, select Convert System Constants to Constants in the Component Manager.

See also

[ASCET Options - Targets Node](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm)
