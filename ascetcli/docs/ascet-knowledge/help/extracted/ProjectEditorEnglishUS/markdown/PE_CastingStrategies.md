# Casting Strategies

A cast is an operator in the C language to change the type of an expression. Implicit casts are introduced by the rules for integral promotion and arithmetic conversions as specified in the 1999 ANSI C standard. Sometimes it is necessary to introduce explicit casts (written as a type name in parentheses) to ensure that the arithmetic works without overflow.

Casting is a step during the ASCET code generation that determines which explicit casts should be placed in the generated code and which type suffixes should be added to literals ("U" and "L" for integers, "F" for floats).

ASCET provides the following casting strategies:

- [MISRA compliant](PE_MISRA_compliant.md)
- [Arithmetic Services](PE_ArithmeticServices.md)
- [Target Optimized](PE_TargetOptimized.md)

For each project, you can select one of these casting strategies in the Project Properties window, [Code Generation](PE_Code_Generation_Options.md) node.
