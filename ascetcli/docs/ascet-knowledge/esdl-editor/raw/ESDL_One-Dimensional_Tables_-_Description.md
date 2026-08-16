# Characteristic Lines - Description

Characteristic lines describe parameter values in dependence of a given set of sample points rather than using an algorithm. A characteristic line is represented as a one-dimensional table.

For each sample point xn in the table, there exists a parameter value yn which can be retrieved from the one-dimensional table. In addition, the table can cover the entire range of values between sample points using a suitable interpolation.

A characteristic line can be added to a component as described in [Creating a Normal or Fixed Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Createnormal.htm) and [Creating a Group Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Creategroup.htm). Size and data type can be specified in the properties editor as any arithmetic type. The maximum size for one-dimensional tables is 2048 sample point:value pairs.

Unlike arrays and matrices, characteristic lines are created as parameters in ASCET. In ESDL, characteristic lines are adaptive, i.e. methods are available that can be used to alter the characteristic line during execution of a function without user interaction. The methods are listed in [Public Interface of Characteristic Lines](ESDL_Public_Interface_of_One-Dimensional_Tables.md).

The interpolation method for sample points can also be specified in the properties editor. ASCET provides rounded and linear interpolation. Rounded interpolation uses the value from the lower (left) sample point for a given point, whereas linear interpolation derives it from a straight line between sample values. In addition, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm) or mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The table data can either be edited in the table editor or filed in from a tab-delimited ASCII file (see [Description of the Table Editor](../../data-editor/raw/DEd_DataEditor_CombinedTypes.md)).

See also

[Public Interface of Characteristic Lines](ESDL_Public_Interface_of_One-Dimensional_Tables.md)

[Linear Interpolation (1D)](esdl_linear_interpolation%281d).md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[Creating a Normal or Fixed Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Createnormal.htm)

[Creating a Group Characteristic Line/Map](BlockDiagramEditorEnglishUS.chm::/Creategroup.htm)

[Description of the Table Editor](../../data-editor/raw/DEd_DataEditor_CombinedTypes.md)
