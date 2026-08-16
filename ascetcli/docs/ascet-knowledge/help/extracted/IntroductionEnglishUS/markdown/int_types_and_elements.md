# Types and Elements

Every algorithm in a component works on elements. An element contains a piece of data, and makes available an interface for accessing its data or returning the value of a computation (e.g. interpolation of a characteristic line). Elements are strongly typed, i.e. each element is of a fixed type. Since there can be more than just a single element of a given type, an element is referred to as an instance of a given type.

ASCET has a number of basic types, that can be used directly, such as discrete or continuous variables, arrays, matrices or characteristic lines and fields. New, user-defined types can be added to the system in the form of classes. Classes are complex types, they have a complex structure, because they are usually build up from other types (basic as well as other complex ones). The types can be classified as in the following diagram:

![](images/DIA0068.bmp)

As the modelling in ASCET takes place on the physical level, the types are also ’physical’ types. Elements are committed to a specific data type (e.g. unsigned int8) only during the implementation phase, which is independent of the modelling phase.

The physical definition of an element must contain the following information:

- the name of the element
- the model type
- the element kind
- the scope of the element

The options that are available for each of the above categories are described in detail in the following sections.

When defining an element, additional information on the physical unit and a comment can be added to generate a meaningful documentation of the model. This information has no impact on the physical model.

See also

[Scalar Types - Summary](INT_scalar_summary.md)

[Composite Types - Summary](INT_composite_summaryct.md)

[Kind of Elements - Summary](INT_summaryke.md)

[The Scope of Elements](INT_the_scope_of_elements.md)

[User-Defined Model Types](INT_User-Defined_Model_Types.md)
