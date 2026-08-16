# Characteristic Lines and Maps

![](icon_charlinemap.gif)To support nonlinear control engineering, characteristic lines and maps are available in ASCET. They are used to describe a value in dependence of one or two other values, where either the functional dependence is not known exactly or calculating the function would be computationally expensive.

For one table, the parameter and the output value must be of the same arithmetic type, e.g. there is no characteristic map where continuous and discrete types can be mixed.

A characteristic line is represented as a one-dimensional table of sample points, each of which is associated with a sample value. The sample points represent the x-axis of a function graph, the sample values represent the curve being described. The size of characteristic lines is limited to 2048 sample points.

Accordingly, a characteristic map is represented by a two-dimensional table of sample points for pairs of input values, where a sample value is associated with each pair of sample points. The size of characteristic maps is limited to 63 sample points on each axis.

Characteristic lines/maps are created as parameters. In block diagrams and C code components, they can only be read from within the model. In ESDL components, characteristic lines and maps are adaptive, i.e. additional methods are available that can be used to alter characteristic lines and maps.

If the monotony requirements set in the interpolation routine options or in the Table Editors node of the ASCET options window are not met when the table data are edited, a warning opens when the data editor for the table is closed.

Each characteristic line/map is associated an interpolation and extrapolation routine. These routines determine how the output value of a characteristic line/map is derived from the input value(s). With rounded interpolation, the value between two sample points is derived from the sample value at the lower (left) sample point. With linear interpolation, the value is derived from a straight line between the sample values. In addition to these interpolation routines provided by ASCET, [user-defined interpolation routines](INT_UserDefinedInterpolationRoutines.md) can be used.

The interface of a characteristic line/map depends on its dimension and whether it is a normal, [fixed](INT_fixed_table.md) or [group table](INT_group_table_and_distribution.md). There are basically three methods:

- void search (arithmetic type a): This method applies to normal characteristic lines/maps and to the distributions of group characteristic lines/maps. Here the correct supporting points are searched, and the interpolation factors are computed. For two-dimensional tables there are two parameters, i.e. void search (arithmetic type a, arithmetic type b).
- arithmetic type interpolate(): This method interpolates the value of the characteristic line or map from the interpolation factors and the value points at the associated supporting points.
- arithmetic type getAt (arithmetic type a) is the combination of the search and interpolate method. It is not available for group characteristic lines/maps. For two-dimensional tables, there are two parameters, i.e. void getAt (arithmetic type a, arithmetic type b).

The separation of the method getAt into the methods search and interpolate only makes sense for group tables/distributions. A distribution only has the method search. A group table only has the method interpolate. A regular or fixed characteristic table has all three methods.

See also

[High-Resolution Interpolation Routines](INT_HighRes_InterpolationRoutines.md)

[User-Defined Interpolation Routines](INT_UserDefinedInterpolationRoutines.md)

[Group Table and Distribution](INT_group_table_and_distribution.md)

[Fixed Table](INT_fixed_table.md)

[ESDL Editor - Public Interface of Characteristic Lines](esdleditorenglishus.chm::/ESDL_Public_Interface_of_One-Dimensional_Tables.htm)

[ESDL Editor - Public Interface of Characteristic Maps](esdleditorenglishus.chm::/ESDL_Public_Interface_of_Two-Dimensional_Tables.htm)
