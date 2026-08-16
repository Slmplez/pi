# The Implementation of Composite Types

For composite types like arrays, matrices or characteristic tables, the implementation is specified for the interface elements of the composite types, which themselves are of a scalar type.

For arrays, for instance, the implementation for the elements held in the array must be given. This implementation is valid for both, the input and the output of the array. The implementation for the index is fixed, since the index is a discrete model type.

For characteristic tables, the implementation of the x-points and y-points and the values of the table can be specified separately from each other.
