# Public Interface of Distributions and Group Tables

Unlike plain tables, group tables do not have a getAt method. Instead, the public interface is "split" between the distribution, which has a search method, and the group table, which has an interpolate method.

A two-dimensional table requires sample points to be set for both distributions before the corresponding value can be interpolated.

##### The first table shows the public interface of distributions in ESDL.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| search(Xvalue) | void | Set the sample point of the distribution to Xvalue or calculates the interpolation factor for Xvalue . |
| getX(index) | <type of distribution> | Gets the axis point at index . |
| setX(index, value) | void | Sets the axis point at index to value . |
| getMaxSize() | udisc | Gets the max. size of the distribution. |
| getCurrentSize() | udisc | Gets the current size of the distribution. |
| setCurrentSize(size) | void | Gets the current size of the distribution to size . |

The type of Xvalue and value must be the same as the type of the distribution; index and size must be non-negative integers.

##### The second table shows the public interface of group characteristic lines (1D group tables) in ESDL.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| interpolate() | <type of group table> | Get the value for the current sample points or interpolate it from the table. |
| getValue(index) | index | Gets the value at index . |
| setValue(index, value) | void | Sets the value at index to value . |
| getMaxSize() | udisc | Gets the max. size of the group table. |
| getCurrentSize() | udisc | Gets the current size of the group table. |
| setCurrentSize(size) | void | Sets the current size of the group table to size . |

The type of Xvalue and value must be the same as the type of the distribution; index and size must be non-negative integers.

##### The third table shows the public interface of group characteristic maps (2D group tables) in ESDL.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| interpolate() | <type of group table> | Get the value for the current sample points or interpolate it from the table. |
| getValue(indexX, indexY) | index | Gets the value at indexX and indexY . |
| setValue(indexX, indexY, value) | void | Sets the value at indexX and indexY to value . |
| getMaxSizeX() | udisc | Gets the max. X size of the group table. |
| getMaxSizeY() | udisc | Gets the max. Y size of the group table. |
| getCurrentSizeX() | udisc | Gets the current X size of the group table. |
| getCurrentSizeY() | udisc | Gets the current Y size of the group table. |
| setCurrentSizeY(sizeX) | void | Sets the current X size of the group table to sizeX . |
| setCurrentSizeY(sizeY) | void | Sets the current Y size of the group table to sizeX . |

The type of Xvalue, Yvalue and value must be the same as the type of the characteristic map; indexX , indexY, sizeX and sizeY must be non-negative integers.

See also

[Distributions and Group Tables - Description](esdl_distributions_and_group_tables_-_description.md)
