# Implementations for Temporary Variables

Temporary variables in block diagrams are deprecated; they will be removed in a future ASCET version.

Temporary variables can be specified at the outputs of operators, composite and complex model elements in block diagrams if the Disable BDE Temp Variable Generation option in the [Optimization](ProjectEditorEnglishUS.chm::/CodeOptimization.htm) node of the parent project properties is deactivated. For these temporary variables, the code generator determines the implementation automatically. When a temporary variable is assigned an implemented quantity for the first time, the temporary variable obtains the corresponding conversion formula and value range. The implementation data type is chosen so that it is appropriate for the conversion formula and value range.

The insertion of a temporary variable in a mathematical expression does not affect the generation of mathematical operations for this expression. Temporary variables should not be used in different branches of the control flow (e.g. in the branches of an If statement). The result and the implementation (e.g. quantization) may be different for the separate branches. This could cause serious arithmetical errors in the generated code.

See also

[Temporary Variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm)

[Project Properties Window - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)
