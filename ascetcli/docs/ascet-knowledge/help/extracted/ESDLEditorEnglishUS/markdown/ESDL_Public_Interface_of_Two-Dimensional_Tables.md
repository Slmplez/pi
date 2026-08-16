# Public Interface of Characteristic Maps

In ESDL, characteristic maps can only be accessed using their public interface. The table summarizes the public methods available for characteristic maps.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| search(Xvalue, Yvalue) | void | Sets the sample point of the table to Xvalue and Yvalue or calculates interpolation factor for Xvalue and Yvalue . |
| interpolate() | <type of char. map> | Gets the value for the current sample points or interpolate it from the table. |
| getAt(Xvalue, Yvalue) | <type of char. map> | Sets the sample points to Xvalue and Yvalue and gets the corresponding value or calculates interpolation factor for Xvalue and Yvalue and interpolates the value. |
| getX(indexX) | <type of x axis> | Gets the X axis point at indexX . Not available for fixed characteristic maps. |
| setX(indexX, Xvalue) | void | Sets the X axis point at indexX to Xvalue . Not available for fixed characteristic maps. |
| getY(indexY) | <type of y axis> | Gets the Y axis point at indexY . Not available for fixed characteristic maps. |
| setY(indexY, Yvalue) | void | Sets the Y axis point at indexY to Yvalue . Not available for fixed characteristic maps. |
| getValue(indexX, indexY) | <type of char. map> | Gets the value at indexX and IndexY . |
| setValue(indexX, indexY, value) | void | Sets the value at indexX and IndexY to value . |
| getMaxSizeX() | udisc | Gets the max. size of the characteristic map. |
| getCurrentSizeX() | udisc | Gets the current size of the characteristic map. |
| setCurrentSizeX(sizeX) | void | Sets the current size of the characteristic map to sizeX . |
| getMaxSizeY() | udisc | Gets the max. size of the characteristic map. |
| getCurrentSizeY() | udisc | Gets the current size of the characteristic map. |
| setCurrentSizeY(sizeY) | void | Sets the current size of the characteristic map to sizeY . |

The type of Xvalue, Yvalue and value must be the same as the type of the characteristic map; indexX , indexY, sizeX and sizeY must be non-negative integers.

See also

[Adaptive Characteristic Lines/Maps: Restrictions](ESDL_AdaptiveCharacteristic_Restrictions.md)

[Characteristic Maps - Description](ESDL_Two-Dimensional_Tables_-_Description.md)

[Linear Interpolation (2D)](esdl_linear_interpolation_(2d).md)
