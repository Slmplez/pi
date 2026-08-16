# Composite Types - Summary

Composite types are basic types that are built up from basic scalar types. The following composite types are available in ASCET:

- Array (![](symboltyp_array.gif))
- Matrix (![](symboltyp_matrix.gif))
- Characteristic line (![](symboltyp_charline.gif))
- Characteristic map (![](symboltyp_charfield.gif))
- Distribution (![](symboltyp_distrib.gif))

Composite types consist of basic scalar types. Arrays and matrices can consist of all four scalar types, characteristic lines, maps, and distributions only of the three arithmetic types. Unlike basic scalar types, composite types are reference types. When assigning two variables of reference types to each other, not the values are assigned (and copied), but the references to the variable.

All reference types have access methods for their elements:

- set (reference type a): This is an assignment of the reference to reference type a. After such an assignment, both elements (the assigned as well as the assigning) are the identical element!
- get: This returns a reference to the element of composite type.

Argument passing in method calls works in the same manner as assignments. A reference is passed to the element. As a consequence, a change to the argument, for instance by assigning a value to it, is also reflected outside the method. This mechanism is equivalent to a "call by reference" in programming languages like C.

See also

[Array](INT_Array.md)

[Matrix](INT_matrix.md)

[Variant Size for Arrays and Matrices](INT_VariantSize_ArraysMatrices.md)

[V](INT_VariableSize_ArraysMatrices.md)ariable Size for Arrays and Matrices

[Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md)

[Group Table and Distribution](INT_group_table_and_distribution.md)

[Fixed Table](INT_fixed_table.md)
