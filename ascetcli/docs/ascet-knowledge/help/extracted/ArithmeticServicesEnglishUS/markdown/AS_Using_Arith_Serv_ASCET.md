# Using Arithmetic Services in ASCET

ASCET supports the use of arithmetic services:

- For physical specifications in ESDL and in the block diagram.
- In classes, modules and state machines.
- For off-line and online experiments.
- For micro-controller targets, experimental targets (rapid prototyping) and PC.

The use of arithmetic services is directly linked to the code generation. The code generator takes the information regarding the function to be selected from the data types of the elements, which are linked with the corresponding inputs and outputs of an operation.

If, for example, an addition has two inputs of the unsigned integer 8 bit type (uint8) and one output of the unsigned integer 16 bit type (uint16), the code generator searches the current set for the +|u8|u8|u16 key. If the key is found, the code generator uses the function call stored there. Otherwise, depending on the type of the operation, it either uses the standard operation or generates an error message.

See also

[Selecting a Set of Arithmetic Services](select_set_arith_services.md)

[Potential Error Conditions](AS_Potential_Error_Conditions.md)
