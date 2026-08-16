# Table Editor (Editor for Combined Types)

The Table Editor is a single editor that can be used for the various combined types, i.e. for arrays, matrices, characteristic lines/maps and distributions. It contains the following elements:

- [Edit](EE_edit_menu.md) menu
- [Axis](EE_axis_menu.md) menu
- [View](EE_calibration_view_menu.md) menu
- [Extras](EE_extras_menu.md) menu
- v combo box containing the name(s) and types of the edited table(s)
- the table field

The content of this field depends on the kind of table you edit.

| Column 1 | Column 2 |
| --- | --- |
| array | The first row in the table contains the index values. These values are fixed; they always start at 0 and are always incremented by one. The second row contains the array values. |
| matrix | The first row in the table contains the x index values. The first column in the table contains the y index points. These values are fixed; they always start at 0 and are always incremented by one. The remaining cells contain the matrix values. |
| characteristic line | The first row in the table contains the x-axis sample points. The values can be edited. The second row contains the values. |
| characteristic map | The first line in the table contains the x-axis sample points. The first row in the table contains the y-axis sample points. The values can be edited. The remaining cells contain the values. |
| distribution | The first row in the table contains index values. These values are fixed. The row line contains the values, i.e. the sample points of the group characteristic table that uses the distribution. |

- x-Max Size field

Determines the maximal size of the x-axis.

- X-Size field

Determines the actual size of the x-axis.

- y-Max Size and Y-Size fields

Only available for a matrix or characteristic map.

Determine maximal and actual size of the y-axis.

- Interpol. combo box

Only available for a characteristic line or map.

Contains all available interpolation routines. By default, Linear and Rounded are available, more appear when you added your own interpolation routines (see [User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)).

You can switch between different "normal" interpolation routines, or between different "double-precision" interpolation routines, or from a "double-precision" to a "normal" interpolation routine. You cannot, however, switch from a "normal" interpolation to a "double-precision" interpolation routine; an error is issued if you try.

- Extrapol. combo box

Only available for a characteristic line or map.

Contains all available extrapolation routines.

See also

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm)
