# Variable Size for Arrays and Matrices

The size of an array or matrix is determined when the element is created. In addition, ASCET allows the determination of normal arrays/matrices with variable sizes.

Arrays/matrices used as messages cannot have variable sizes.

A common use case for arrays/matrices with variable size is to have a method that accepts arrays/matrices of any size, and then compute the average, min, max, etc. inside the method.

The following rules apply:

- Only arrays and matrices that are references can be of variable size.

This means composite method arguments, return values, method-/process-/runnable-local variables and arrays/matrices with activated Reference option.

- Only arrays and matrices with kind Variable can be of variable size.
- For a matrix, either both dimensions or no dimension must be of variable size.

A mixed mode, i.e. one dimension with variable size, the other with fixed or variant size, is not possible. If you try to specify such a matrix, an error window opens, and you have to change the matrix specification.

If you use an array or matrix with variable size, keep the following in mind:

- Index protection (see [Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm), Protected Vector Indices) uses the actual size of the array or matrix.
- If an array/matrix instance (i.e. no reference) with variable size is detected during code generation, an error of type MMdl787 is issued:

Element <name> has variable array/matrix reference flag but is no reference.

- An array/matrix reference of fixed or variant size must not be assigned to an array/matrix reference of variable size. If such an assignment is detected during code generation, an error of type MMdl789 is issued:
- Models that use arrays/matrices with variable size can only be exported to ASCET V6.3.0 or newer.

See also

[Specifying an Array or Matrix with Variable Size](ElementEditorEnglishUS.chm::/Eed_SpecifyArrayMatrix_VariableSize.htm)

[Defining a Component Signature](BlockDiagramEditorEnglishUS.chm::/BDE_DefineComponentSignature.htm), steps 4, 5, 6

[Defining the SWC Signature](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCdefineSWCsignature.htm), steps 6, 7, 8

[Array](INT_Array.md)

[Matrix](INT_matrix.md)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Initialization of Explicit References](INT_InitExplicitReferences.md)

[The Kind of Elements - Summary](INT_summaryke.md)

[Variant Size for Arrays and Matrices](INT_VariantSize_ArraysMatrices.md)

[Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)

[Editing the Configuration of a Composite Element](ElementEditorEnglishUS.chm::/eed_editconfiguration_compositeelement.htm)

[Converting Arrays/Matrices to Variable Size](ComponentManagerEnglishUS.chm::/CM_ConvertArraysMatrices_VariableSize.htm)
