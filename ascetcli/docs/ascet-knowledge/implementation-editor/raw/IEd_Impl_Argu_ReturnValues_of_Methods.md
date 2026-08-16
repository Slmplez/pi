# Implementations of Arguments and Return Values of Methods

The arguments and return value of a method are implemented exactly as other elements of the same type (see [Implementations of Components/Projects](IEd_impl_comp_proj_s.md), [Implementation of Scalar, Non-logical Elements](impl_scalar_nonlogical.md), [Implementations of Arrays, Matrices and Tables](IEd_impl_arrays_matrices_tables.md), [Specifying an Implementation for a Logical Element](specify_impl-logicalelement.md) and [Specifying an Enumeration Implementation](specify_enum_impl.md)).

For scalar and logical arguments and return values, and arguments and return values of type <enumeration>, the Memory location * combo boxes are deactivated. These elements are stored in the STACK memory class.

If references are used as arguments or return value, i.e. the type <array[*]>, <mat[*]> or <user defined> is selected, a memory class can be selected in the Memoy location of Instance combo box. This memory class does not apply to the reference in this case, it applies to the target of the reference.

See also

[Implementations of Components/Projects](IEd_impl_comp_proj_s.md)

[Implementation of Scalar, Non-logical Elements](impl_scalar_nonlogical.md)

[Implementations of Arrays, Matrices and Tables](IEd_impl_arrays_matrices_tables.md)

[Specifying an Implementation for a Logical Element](specify_impl-logicalelement.md)

[Specifying an Enumeration Implementation](specify_enum_impl.md)
