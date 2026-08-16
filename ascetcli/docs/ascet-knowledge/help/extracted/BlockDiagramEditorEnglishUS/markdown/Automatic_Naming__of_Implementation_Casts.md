# Automatic Naming of Implementation Casts

The implementation casts are named automatically in accordance with the following scheme:

<operator><m>_<pin type><n>

- operator

Depending on the selected operator, have the values add, sub, mul, div, abs or neg.

- m

Is the number of the operator. The first operator of a type for which implementation casts are generated in this way is assigned the number 1, further operators of the same type are then numbered consecutively (2,3,....).

- pin type

Is the description of the operator pin connected to the implementation cast, i.e. in for inputs and out for outputs.

- n

Is the number of the implementation cast. Implementation casts connected to the inputs and output of the operator are numbered separately.

1. The implementation cast connected to the first operator input is assigned the number 1, further inputs are numbered consecutively.

The number is omitted if the operator has only one input.

1. If the operator output is connected to more than one element, the implementation casts are numbered, beginning with 1.

If the operator input is connected to one element, the number is omitted.
