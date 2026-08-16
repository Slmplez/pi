# Arrays - Description

An array is a one-dimensional, indexed set of variables which have the same data type. In ESDL, arrays are available for all basic data types. The variables are accessed through the array index, the first index position is 0.

An array can be added to a module by adding it to the Outline tab in the ESDL Editor. The array type can be specified in the properties editor as any primitive type.

The array size and its data can be edited using the Table Editor dialog which is automatically opened when the data of an array are to be edited. You can specify both the current and maximum size of the array in the table editor.

The array size cannot be modified at runtime. The maximum size for arrays is 2048 elements.

The array data can either be edited in the table editor or filed in from a tab-delimited ASCII file (see [The Table Editor (Editor for Combined Types)](DataEditorEnglishUS.chm::/DEd_editor_combined_types.htm)).

In ESDL, elements of an array can be read and written to using the following syntax:

val = myArray[index];

myArray[index] = val;

The first statement reads the value of the array element at position index and assigns it to the variable val, which must be the same type as the array. Since the array index count starts from 0, myArray[3] returns the fourth element of an array.

The second statement sets the value of the array element at position index to val, which must be the same data type as the array.

In the context of a project, you can use the [Protected Vector Indices](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) option to protect the array index against over- or underflow.

See also

[Public Interface of Arrays](ESDL_Public_Interface_of_Arrays.md)

[Data Editor - The Table Editor (Editor for Combined Types)](DataEditorEnglishUS.chm::/DEd_editor_combined_types.htm)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
