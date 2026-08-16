# Matrices - Description

A matrix is a two-dimensional, indexed set of variables which have the same data type. In ESDL, matrices are available for all basic data types. The variables are accessed through the array indices x and y, the first index position is 0.

A matrix can be added and manipulated in the ESDL Editor in exactly the same manner as an array. The matrix size cannot be modified at runtime. The maximum size of matrices is 63 elements per dimension.

The elements of a matrix can be read and written to in ESDL using the following syntax:

val = matrix [indX] [indY];

matrix [indX] [indY] = val;

The first statement assigns the value of the matrix element at position column indX and row indY to the variable val, which must be the same type as the matrix. Since the index count starts from 0, myMatrix[2][3] returns the third element in the fourth row of a matrix.

The second statement sets the value of the matrix element at position column indX and row indY to val, which must be the same data type as the matrix.

In the context of a project, you can use the [Protected Vector Indices](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) option to protect the matrix indices against over- or underflow.

See also

[Public Interface of Matrices](ESDL_Public_Interface_of_Matrices.md)

[Data Editor - The Table Editor (Editor for Combined Types)](DataEditorEnglishUS.chm::/DEd_editor_combined_types.htm)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
