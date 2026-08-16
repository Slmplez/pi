# Editing a Characteristic Line

To edit a characteristic line or 1-D table, proceed as follows:

1. [Open the data editor](DEd_open_editor.md) for the table.
1. Adjust the number of sample points in the x-Size box.
1. Adjust the sample points.
1. Modify the z-axis values as described in [Setting Up an Array](DEd_setup_array.md).
1. Click OK.

The interpolation mode is selected in the Properties editor of the characteristic line. It cannot be changed in the table editor.

The extrapolation mode is always set to Constant. For all x-values greater than the highest x-value defined in the table, the value returned is the z-value of the highest x-value. For values that fall below the lowest x-value, the z-value of the lowest x-value is returned.

The sample points are shown on the x-axis of the data area, the values are on the z-axis. By default the number of sample points that you entered in the Properties editor is created. The default sample points form a range between 0 and the number of sample points minus 1.

See also

[Opening a Data Editor](DEd_open_editor.md)

[Setting Up an Array or Matrix](DEd_setup_array.md)

[Properties Editor - Overview](ElementEditorEnglishUS.chm::/EEd_Overview.htm)
