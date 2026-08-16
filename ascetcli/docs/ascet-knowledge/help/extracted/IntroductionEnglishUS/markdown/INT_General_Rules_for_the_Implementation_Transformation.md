# General Rules for the Implementation Transformation

The implementation transformation works on arithmetic values. The values are adjusted in all arithmetic expressions, so the corresponding arithmetic operations can be executed:

Addition and Subtraction

The arguments of these operations are adjusted to an quantization. This quantization is determined by the internal code generation algorithms and minimizes the number of re-quantizations. The constant offset is calculated for the result from the quantizations and the offset of the arguments.

Multiplication and Division

The arguments of these operations are first made offset free, before the multiplication or division can take place. The quantization must not be adapted, but is determined from the result of the multiplication or division. However, to avoid overflow or a loss in precision, the quantization of the arguments may be multiplied by a power of two (shift operations). This is also automatically determined by the internal code generation algorithm.

Comparison, Minimum and Maximum

Similarly to addition, the arguments are adjusted to each other (as well in quantization as in offset). The minimum and maximum operator work like the addition operator.

Assignment

The value that is assigned to a variable is re-quantized and the offset is corrected before assignment is performed. This also applies to argument passing.

See also

[Overview - Code Generation with Implementations](INT_Overview_CodeGen_w_Implementations.md)

[Example: Code Generation for an Addition](INT_Example__Code_Generation_for_an_Addition.md)

[Transformation of Data under Implementation](INT_Transformation_of_Data_under_Implementation.md)
