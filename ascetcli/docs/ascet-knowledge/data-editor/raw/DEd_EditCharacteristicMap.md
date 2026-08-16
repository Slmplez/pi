# Editing a Characteristic Map

To edit a characteristic map or 2-D table, proceed as follows:

1. [Open the data editor](DEd_open_editor.md) for the table.
1. Adjust the number of sample points in the x-Size and y-Size boxes.
1. Adjust the sample points.
1. Adjust the values.
1. Click OK.

The interpolation mode is selected in the Properties editor of the characteristic map. It cannot be changed in the table editor.

The extrapolation mode is always set to Constant. For all x- or y-values greater than the highest x-/y-value defined in the table, the value returned is the value of the highest x-/y-value. For values that fall below the lowest x- or y-value, the value of the lowest x-/y-value is returned.

See also

[Opening a Data Editor](DEd_open_editor.md)

[Properties Editor - Overview](../../element-editor/raw/EEd_Overview.md)
