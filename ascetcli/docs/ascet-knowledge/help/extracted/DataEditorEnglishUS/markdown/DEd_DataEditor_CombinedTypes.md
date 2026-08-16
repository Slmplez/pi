# Description of the Table Editor (Data Editor for Combined Types)

- The Table Editor is a single editor that can be used for the various combined types, i.e. for arrays, matrices, characteristic lines/maps and distributions. It contains the following elements:

- [Edit](DEd_EditMenuTableEditor.md) menu
- [Axis](DEd_AxisMenuTableEditor.md) menu
- [View](DEd_ViewMenuTableEditor.md) menu
- [Extras](DEd_ExtrasMenuTableEditor.md) menu
- combo box containing the name(s) of the edited table(s)
- the table field

The content of this field depends on the kind of table you edit.

| Column 1 | Column 2 |
| --- | --- |
| array | The first line in the table contains the index values. These values are fixed; they always start at 0 and are always incremented by one. The second line contains the array values. |
| matrix | The first line in the table contains the x index values. The first row in the table contains the y index points. These values are fixed; they always start at 0 and are always incremented by one. The remaining cells contain the matrix values. |
| characteristic line | The first line in the table contains the x-axis sample points. The values can be edited. The second line contains the values. |
| characteristic map | The first line in the table contains the x-axis sample points. The first row in the table contains the y-axis sample points. The values can be edited. The remaining cells contain the values. |
| distribution | The first line in the table contains index values. These values are fixed. The second line contains the values, i.e. the sample points of the group characteristic table that uses the distribution. |

- x-Max Size field

Determines the maximal size of the x-axis.

- X-Size field

Determines the actual size of the x-axis.

- y-Max Size and Y-Size fields

Only available for a matrix or characteristic map.

Determine maximal and actual size of the y-axis.

- Interpol. combo box

Only available for a characteristic line or map.

Shows the currently selected interpolation routine. By default, this is either Linear or Rounded, but you can add your own interpolation routines (see [User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)).

- Extrapol. combo box

Only available for a characteristic line or map.

Contains all available extrapolation routines.

![](BUTTON.GIF) OK

Closes the editor and accepts the changes.

![](BUTTON.GIF) Cancel

Closes the editor without accepting the changes.

See also

[Setting up an Array](DEd_setup_array.md)

[Editing a Characteristic Line](DEd_edit_1d_table.md)

[Editing the Axis Points of a Fixed Characteristic Line/Map](DEd_setup_axis_points.md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)
