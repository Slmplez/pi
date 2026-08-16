# Fixed Table

The computation of interpolation factors for characteristic lines/maps can be optimized using two special types of characteristic tables in ASCET: group tables and fixed tables.

![](icon_FixedTable.gif)A fixed table has an equidistant distribution, i.e. the sample points have a constant distance from each other. This makes the computation of interpolation factors much faster. The memory requirements are lower as well, since only an offset and a distance have to be stored.

The interface of a fixed characteristic line/map is the same as the interface of a normal characteristic line/map, see [Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md#Interface_Char_LineMap).

In ESDL components, fixed characteristic lines/maps are adaptive, i.e. additional methods are available that can be used to alter fixed characteristic lines/maps.

See also

[Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md)

[ESDL Editor - Public Interface of Characteristic Lines](esdleditorenglishus.chm::/ESDL_Public_Interface_of_One-Dimensional_Tables.htm)

[ESDL Editor - Public Interface of Characteristic Maps](esdleditorenglishus.chm::/ESDL_Public_Interface_of_Two-Dimensional_Tables.htm)
