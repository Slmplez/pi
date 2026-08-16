# Arithmetic Services and Constants

A special case for using arithmetic services arises when constants are used in an operation. Constants defined in ASCET and literals do not have any specific type. If the user has selected to use arithmetic services, types are automatically assigned to these values during the code generation process. In this case, the code generator selects the first type from the list that is suitable for the value of the constant:

sint8, uint8, sint16, uint16, sint32, uint32

An exception to this rule occurs if a binary operator has as its input both a constant of an undefined type and a variable with a defined type.

- If the value of the constant is positive and the type of the variable is unsigned, the constant is assigned the same type as the variable. The purpose of this exception is to achieve, in as many cases as possible, a uniform type for the inputs of an operation.

- If the value of the constant is negative, a signed type must be selected for it. There are two possibilities:

1. The variable is unsigned:

In this case, type uniformity is impossible.

1. The variable is signed:

If the value of the constant conforms to the type of the variable, the type of the variable is assigned to the constant. Otherwise, type uniformity is impossible.
