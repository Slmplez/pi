# Implementation of Scalar, Non-Logical Elements

The implementation of non-logical elements describes the transformation from an infinite model domain (either continuous or discrete) to a finite implementation domain. Therefore the range for the values in the model has to have interval limits. Additionally, a linear formula describing the transformation from the physical to the implemented representation has to be defined.

For the model type continuous, which has an infinitely fine resolution, the formula determines the quantization in the implementation domain using special fixed-point arithmetic. The quantization is the reciprocal of the gradient of the linear formula since the implementation is assumed to be in integer arithmetic.

See also

[Opening the Implementation Editor for an Element (A)](IEd_open_impl_editor.md)

[Specifying Individual Implementations](specifying_individual_impl.md)

[Using Implementation Types](using_impl_types.md)
