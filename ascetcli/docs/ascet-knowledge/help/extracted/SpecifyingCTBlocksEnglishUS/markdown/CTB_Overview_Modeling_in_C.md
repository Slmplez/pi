# Overview - Modeling in C

Modeling in C offers the capabilities of the C language but no semantic checks. Continuous time basic blocks specified in C may be hardware-dependent. If programming is done in ANSI-C, it is possible to create hardware-independent models even in C. This is necessary if pointers or C subroutines are to be used. C basic blocks can be used to model hardware-dependent blocks and in the same way as ESDL basic blocks. C basic blocks require an explicit specification whether they have a direct pass-through (output depends directly from the input) or an indirect pass-through by selecting direct or nondirect in the "Block Behavior" combo box. This affects the automatic determination of the execution sequence.

When modeling in C, there are no semantic checks ensuring consistent modeling (as in ESDL). Consistency has to be ensured by the user. It is recommended to use C for modeling continuous time systems only if absolutely necessary, e.g., for modeling controller-dependent system portions or if C pointers or C subroutines have to be used.

See also

[Differential Equations in C](CTB_Differential_Equations_in_C.md)

[Overview - Additional C Routines](CTB_Overview_Additional_C_Routines.md)

[Overview - C Code Editor](CCodeEditorEnglishUS.chm::/CC_Overview.htm)
