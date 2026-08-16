# Graphical Editors

The 1-D and 2-D graphical editors can be used to calibrate characteristic lines and maps. They contain the following elements:

- [Edit](EE_edit_menu.md) menu
- [View](EE_calibration_view_menu.md) menu
- [Extras](EE_extras_menu.md) menu
- v combo box containing the name(s) of the edited table(s)
- the graphical display

The content of this field depends on the kind of table you edit.

| Column 1 | Column 2 |
| --- | --- |
| characteristic line | The X axis represents the sample points, the Z axis represents the values. The values are represented by squares (connected with lines) that can be moved up and down to edit the value and - for a normal characteristic line - left and right to edit the sample point. |
| characteristic map | A 2-D table is shown as a collection of 1-D tables that can be edited individually. The horizontal axis represents either the X or the Y sample points, the vertical Z axis represents the values. The values are represented by squares (connected with lines) that can be moved up and down to edit the value and - for a normal characteristic map - left and right to edit the sample point. |

- x-Max Size and X-Size fields

Determine (normal characteristic line/map) or show (fixed characteristic line/map) maximal and actual size of the x-axis.

- y-Max Size and Y-Size fields

Only available for a matrix or characteristic map.

Determine (normal characteristic line/map) or show (fixed characteristic line/map) maximal and actual size of the y-axis.

- Interpol. combo box

Only available for a characteristic line or map.

Contains all available interpolation routines. By default, Linear and Rounded are available, more appear when you added your own interpolation routines (see [User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)).

You can switch between different "normal" interpolation routines, or between different "double-precision" interpolation routines, or from a "double-precision" to a "normal" interpolation routine. You cannot, however, switch from a "normal" interpolation to a "double-precision" interpolation routine; an error is issued if you try.

- Extrapol. combo box

Only available for a characteristic line or map.

Contains all available extrapolation routines.

You can

[Edit a Table in the 1-D Graphical Editor](EE_edit_table_1d_g_e.md)

[Edit a Table in the 2-D Graphical Editor](EE_edit_table_2d_g_e.md)

[Toggle the Perspective of the 2-D Editor](toggle_perspective_2d_editor.md)

See also

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm)
