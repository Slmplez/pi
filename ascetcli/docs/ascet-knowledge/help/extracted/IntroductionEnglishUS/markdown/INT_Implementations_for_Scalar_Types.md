# Implementations for Scalar Types

The implementation describes how an element of a basic type is realized in the generated C code. The implementation specification for elements of type logical is very easy, since a logical element has only two values, either true or false.

The implementation specification consists only of the data type. For logical elements either byte, word, or long can be chosen.

The implementation specification for the arithmetic types is much more complex. It describes, among other things, the implementation type, which can be an integer type even for elements of type continuous. The implementation specification therefore contains a complex transformation from the physical domain to the implementation domain, which can be very different from each other.

The differences between the physical domain (e.g. model type continuous) and the implementation domain are the infinite range of the physical domain from -infinity to +infinity, and its arbitrarily fine resolution. In the implementation domain, on the other hand, the range is limited by the word length, and the resolution is not arbitrarily fine but fixed to 1.

In order to make a transformation between the physical domain and the implementation domain possible, the range of the physical domain has to be limited. Thus each element must be assigned an interval for the relevant physical values. The resolution must also be restricted. Therefore, each element has to be given a fixed resolution, the quantization.

See also

[Example - Implementations for Scalar Types](INT_Example_Implementations_ScalarTypes.md)
