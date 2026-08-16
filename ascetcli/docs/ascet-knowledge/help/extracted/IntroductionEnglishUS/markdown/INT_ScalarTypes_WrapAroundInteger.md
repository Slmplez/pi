# Scalar Types: Wrap-Around Integer

Wrap-Around Integer (type symbol ![](symboltyp_limitInt.gif)) is a scalar type that is introduced with ASCET V6.4. This type can be used for scalar elements and as a base type for arrays and matrixes. Wrap-Around Integer is also referred to as model type wrapInt.

A model that calculates with values of Wrap-Around Integer type is generated without optimizations that may affect the result. x / 2 * 2, for example, is not optimized to x.

If an overflow occurs, the value shall wrap around as specified by two´s complement arithmetic. The signedness for the overflow is determined from the operands, and a code generation error of type MMdl6 is reported if the operands have mixed signedness. The bit size of the overflow is determined from the maximum bit size of the operands.

The behavior of these calculations is identical for all targets, all compilers and for physical and implemented code generation (see [Build Node (Project Properties)](ProjectEditorEnglishUS.chm::/Build_Options.htm)).

See also

[Build Node (Project Properties)](ProjectEditorEnglishUS.chm::/Build_Options.htm)
