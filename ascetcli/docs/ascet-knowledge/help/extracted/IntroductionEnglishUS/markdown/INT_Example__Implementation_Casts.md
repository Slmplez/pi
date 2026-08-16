# Example: Implementation Casts

In a simple arithmetic specification, two variables, a and b, are added, the result of the addition is multiplied by the literal 2, and the result of the multiplication is assigned to variable c (see figure)

![](AddMul_ohne_Impl_Cast%20copy.gif)

During implementation, variables a, b and c have been assigned the int16 type; all three variables use the entire possible value range. Because of this, the code generator in the example above would create a 32-bit-wide temporary variable, and would requantize this before assigning it to c to a value range that is applicative for int16 by executing a right shift

Now, if the user knows that the sum of a and b can be no greater than a 16-bit-wide result and thus uses only half of the possible value range (for example, due to physical boundary conditions or because certain correlations in the model compel this to be the case), he or she can define this as such using an implementation cast (see figure below)

![](AddMul_mit_Impl_Cast%20copy.gif)

In implementing the implementation cast with the int16 type and value range [-16384..16383], while disabling both the Limit to maximum bit length and Limit Assignments options, the user guarantees specific properties of the intermediate result for the code generator. This prevents the requantization required in the example illustrated in the first figure.
