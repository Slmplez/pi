# Group Table and Distribution

The computation of interpolation factors for characteristic lines/maps can be optimized using two special types of characteristic tables in ASCET: group tables and fixed tables.

![](icon_GroupTable.gif)A group table (middle and right icon) does not contain a sample point distribution, but references a distribution (left icon) of sample points. Distributions can be shared by many group tables. The computation of the interpolation factors is performed only once for the distribution, and only the computation of the output value is performed for each group table separately.

A distribution is an array of sample points. Two-dimensional group tables therefore reference two distributions. The sequence of sample points must be strictly increasing.

Distributions only have the following interface method:

- void search (arithmetic type a): This method applies to the distribution of a group characteristic line/map. Here the correct supporting points are searched, and the interpolation factors are computed. For two-dimensional tables there are two parameters, i.e. void search (arithmetic type a, arithmetic type b).
- Group tables only have the following interface method:
- arithmetic type interpolate(): This method applies to a group characteristic line/map. It interpolates the value of the characteristic line or map from the interpolation factors and the value points at the associated supporting points.

In ESDL components, group tables and distributions are adaptive, i.e. additional methods are available that can be used to alter group tables and distributions.

See also

[Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md)

[Fixed Table](INT_fixed_table.md)

[ESDL Editor - Public Interface of Distributions and Group Tables](esdleditorenglishus.chm::/ESDL_Public_Interface_of_Distributions_and_Group_Tables.htm)
