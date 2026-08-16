# Arrays and Matrices

An array is a one-dimensional, indexed set of variables which have the same data type. In C code, arrays/matrices are available for all basic data types. The variables are accessed through the array/matrix indices, the first index position of each dimension is 0.

The maximal array or matrix size can be edited in the [Properties editor](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm), the actual size can be edited in the table editor.

The array/matrix size cannot be modified at runtime. The maximum size for arrays is 2048 elements, the maximum size for matrices is 63 elements per dimension.

Array/matrix data can either be edited in the table editor or filed in from a tab-delimited ASCII file; see [The Table Editor (Editor for Combined Types)](DataEditorEnglishUS.chm::/DEd_editor_combined_types.htm).

In C code, elements of an array or matrix can be read and written to using the following syntax:

| Column 1 | Column 2 |
| --- | --- |
| array: | val = myArray[index]; myArray[index] = val; |
| matrix: | val = myMatrix[indX][indY]; myMatrix[indX][indY] = val; |

The first statement in each row reads the value of the array/matrix element at position index or indX/indY and assigns it to the variable val, which must be the same type as the array/matrix. Since array/matrix indices start from 0, myArray[3] returns the fourth element of myArray.

The second statement sets the value of the array/matrix element at position index or indX/indY to val, which must be the same data type as the array or matrix.

The actual size of an array/matrix can be determined using the following syntax:

| Column 1 | Column 2 |
| --- | --- |
| array: | length = myArray.length(); |
| matrix: | lengthX = myMatrix.xLength(); lengthY = myMatrix.yLength(); |

Arrays and matrices can have fixed or [variant](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm) sizes. In addition, arrays/matrices of kind Variable can have [variable](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm) sizes.

In the context of a project, you can use the [Protected Vector Indices option](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) to protect array/matrix indices against over- or underflow.

See also

[Properties Editor for Basic Elements](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm)

[The Table Editor (Editor for Combined Types)](DataEditorEnglishUS.chm::/DEd_editor_combined_types.htm)

[Variant Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm)

[Variable Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm)

[Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
