# Example: Code Generation for an Addition

Imagine the following simple example

c = a + b;

where a, b, and c are model variables of type continuous.

The implementation transformation is linear without an offset. The following quantizations are used: 0.01 for a, 0.04 for b and 0.05 for c. A, B, and C are the corresponding implementation variables for the elements in the generated C code.

When generating code for the above example, the quantizations must be taken into account. For the values a = 1, b = 0.6, and consequently c = 1.6, the result with the above quantizations would be A = 100, B = 15 and C =32. A direct transformation of the model to the implementation level would lead to a wrong result (A+B = 100 + 15 = 115 which is not equal to C = 32).

The reason is that the quantization is not taken into account. The above model equation must be transformed to the implementation transformation. Here the quantizations of A and B have to be adjusted before the addition takes place, and the result of this addition has to be adjusted to the quantization of C. This leads to the following piece of C code for the above model:

C = (A + 4 * B) / 5;

The multiplication of B by 4 corresponds to the adjustment of the quantization 0.04 to 0.01, and the division by 5 corresponds to the adjustment of the quantization of 0.01 to 0.05.
