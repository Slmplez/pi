# Selecting a Formula

To select a formula, proceed as follows:

1. Select a transformation formula from the Formula combo box.
1. If you are preparing a quantized physical experiment, enter a quantization in the Qu. exp. field.

The value in the Qu. exp. field is used exclusively for the Quantized Physical Experiment.

If the variable has the model data type cont and the implementation data type real32 or real64, or if the variable has a model data type different from cont, only the identity formula should be selected because only this formula is supported by the code generation. If you select another formula, a warning or error is displayed in the Consistency field. For more details, see [Formulas](IEd_Formulas.md).

1. To switch to the identity formula, select ident from the Formula combo box.
1. Click OK to close the implementation editor.
1. Click OK without selecting the identity formula.
1. Click Cancel to close the dialog and restore the original settings.

See also

[Formulas](IEd_Formulas.md)

[Code Generation and Experimenting with Projects](ProjectEditorEnglishUS.chm::/experimentingprojects.htm)
