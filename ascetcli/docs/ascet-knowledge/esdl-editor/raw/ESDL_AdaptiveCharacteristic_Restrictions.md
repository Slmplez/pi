# Adaptive Characteristic Lines/Maps: Restrictions

When you are using the methods provided to adapt characteristic lines and maps, several restrictions must be kept:

##### Restrictions checked by ASCET:

1. An index variable (index, indexX, indexY) must be an integer value between 0 and max.size -1.
1. The new current size (size) must be an integer value between 1 and max.size.
1. No interpolation immediately after a change (set*). After a change, a search must be executed first.
1. For fixed characteristic lines/maps, getX(), setX(), getY() and setY() are not supported because no axis points exist.

##### Restrictions not checked by the ASCET code generator:

1. Strict monotony of the axis points
1. Equal sizes of a group table and its associated distribution(s)
1. data inconsistencies caused by interrupting tasks

##### ASCET-SE restrictions:

1. The function setCurrentSize() for characteristic lines/maps and distributions is not supported. Only one field is available to hold the size, this field holds the max. size. If a characteristic line/map or distribution uses less than max.size elements, the last existing table element is used to fill the table.
1. With ASCET-SE targets, the interpolation routines themselves must contain adequate reactions to errors and breaches of restrictions.

See also

[Public Interface of Characteristic Lines](ESDL_Public_Interface_of_One-Dimensional_Tables.md)

[Public Interface of Characteristic Maps](ESDL_Public_Interface_of_Two-Dimensional_Tables.md)

[Public Interface of Distributions and Group Tables](ESDL_Public_Interface_of_Distributions_and_Group_Tables.md)
