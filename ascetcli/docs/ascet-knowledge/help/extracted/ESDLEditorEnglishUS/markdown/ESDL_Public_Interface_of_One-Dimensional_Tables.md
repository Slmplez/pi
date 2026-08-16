# Public Interface of Characteristic Lines

In ESDL, characteristic lines can only be accessed using their public interface. The table summarizes the public methods available for characteristic lines.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| search(Xvalue) | void | Sets the sample point of the table to Xvalue or calculates interpolation factor for Xvalue . |
| interpolate() | <type of char. line> | Gets the value for the current sample point or interpolate it from the table. |
| getAt(Xvalue) | <type of char. line> | Sets the sample point to Xvalue and gets the corresponding value or calculates interpolation factor for X value and interpolates the value. |
| getX(index) | <type of axis> | Gets the axis point at index . Not available for fixed characteristic lines. |
| setX(index, Xvalue) | void | Sets the axis point at index to Xvalue . Not available for fixed characteristic lines. |
| getValue(index) | <type of char. line> | Gets the value at index . |
| setValue(index, value) | void | Sets the value at index to value . |
| getMaxSize() | udisc | Gets the max. size of the characteristic line. |
| getCurrentSize() | udisc | Gets the current size of the characteristic line. |
| setCurrentSize(size) | void | Sets the current size of the characteristic line to size . |

The type of Xvalue and value must be the same as the type of the characteristic line; index and size must be non-negative integers.

See also

[Adaptive Characteristic Lines/Maps: Restrictions](ESDL_AdaptiveCharacteristic_Restrictions.md)

[Tables Characteristic Lines - Description](ESDL_One-Dimensional_Tables_-_Description.md)

[Linear Interpolation (1D)](esdl_linear_interpolation(1d).md)
