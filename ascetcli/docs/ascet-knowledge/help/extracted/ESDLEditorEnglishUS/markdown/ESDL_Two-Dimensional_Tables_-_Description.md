# Characteristic Maps - Description

Characteristic maps describe parameter values in dependence of a given set of pairs of sample points rather than using an algorithm. A characteristic map is represented as a two-dimensional table.

For each pair of sample points (xn : yn) in the table, there exists a parameter value zn which can be retrieved from the two-dimensional table. In addition, the table can cover the entire range of values between sample points using a suitable interpolation.

A characteristic map can be added to a component as described in [Creating a Normal or Fixed Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Createnormal.htm) and [Creating a Group Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Creategroup.htm). Size and data type can be specified in the properties editor as any arithmetic type. The maximum size for two-dimensional tables is 63 pairs of sample points and corresponding values.

Unlike arrays and matrices, characteristic maps are created as parameters in ASCET. In ESDL, characteristic maps are adaptive, i.e. methods are available that can be used to alter the characteristic line during execution of a function without user interaction. The methods are listed in [Public Interface of Characteristic Maps](ESDL_Public_Interface_of_Two-Dimensional_Tables.md).

The interpolation mode for sample points can also be specified in the properties editor. ASCET provides rounded and linear interpolation. Rounded interpolation uses the value from the lower (left) sample point for a given point, whereas linear interpolation derives it from a straight line between sample values. In addition, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm) or mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The table data can either be edited in the table editor or filed in from a tab-delimited ASCII file (see [Description of the Table Editor](DataEditorEnglishUS.chm::/DEd_DataEditor_CombinedTypes.htm)).

See also

[Public Interface of Characteristic Maps](ESDL_Public_Interface_of_Two-Dimensional_Tables.md)

[Linear Interpolation (2D)](esdl_linear_interpolation_(2d).md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[H](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)igh-Resolution Interpolation Routines

[C](BlockDiagramEditorEnglishUS.chm::/Createnormal.htm)reating a Normal or Fixed Characteristic Line/Map

[Creating a Group Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Creategroup.htm)

[Description of the Table Editor](DataEditorEnglishUS.chm::/DEd_DataEditor_CombinedTypes.htm)
