# Example: Implementations for Scalar Types

For example, let A be a range of values in the physical domain, A = [-1, 0.5], and assume a quantization of q = 0.2.

The result of the limitation of the range to an interval and of the quantization is a restriction of the values of an element to a finite set of equidistant values.

Aq = {-1, -0,8, -0.6, -0.4, -0.2, 0, 0.2, 0.4}

This finite set of values can now be mapped to an integer range:

Aint = {-5, -4, -3, -2, -1, 0, 1, 2}

This corresponds to a linear conversion formula between the physical domain to the implementation domain of the kind impl = 5 * phys. The data type for the integer variable is automatically determined from the integer range. In this example, the data type signed int8 would be chosen.

When the range of the physical element has an offset larger than zero, the associated integer interval may only contain a few values, but a large data type has to be used.

Consider for example the physical domain range A = [120, 130] and a quantization of q = 0.5. A linear conversion would result in an integer range Aint = {240, … , 260}.

The type for the integer variable is unsigned int16 in this case, although the number of values would also fit into a variable of type int8.

To implement this, a general linear conversion formula with an offset can be specified. In the above example, a conversion formula of the type

impl = 2 * phys - 240

would lead to an integer interval of {0,…,20} and a variable of data type unsigned int8 would be sufficient.

The conversion formulas are not specified in the context of a component, but in the context of a project. This makes it easy for several components to use the same conversion formulas. Furthermore, this complies with the ASAM-MCD-2MC standard.
