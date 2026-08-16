# Functionality of an Arithmetic Service

In addition to C code descriptions of classes, modules etc., ASCET offers the ability to describe these graphically (in block diagrams) or in an abstract language (ESDL). In order to generate executable code for a control unit or an experiment from such descriptions, the descriptions have to be converted into C code. For this purpose, ASCET is equipped with a code generator. The following example is provided to illustrate why the code generator needs an arithmetic service and what effect this has.

![](CT_sample.gif)

The block diagram above graphically depicts two operations: one addition and one multiplication. There are two possible ways of converting this function into C code.

1. using standard C operations, + and *
1. using separate functions for the addition and multiplication operations

For the addition operation, the standard operation would look like this:

output := input_1 + input_2;

The following would be feasible as a second option:

uint8 add(uint8 summand_1, uint8 summand_2)

{

return summand_1 + summand_2

}

...

output := add(input_1, input_2);

By default, ASCET would apply the standard + operator for the simple addition. By creating an arithmetic service, the user can specify that the second variant is to be applied.

This requires two steps:

1. First, prepare the function code for the uint8 add(uint8 summand_1, uint8 summand_2) function.

This is typically done outside of ASCET, for example in the form of a function library, but can also be carried out within the model.

1. Then define the service call to be applied.

For the simple addition in the example above, this would appear as such:

+|u8|u8|u8 = add(%i1%, %i2%)

The syntax of this definition is explained in the sections below.

Based on this definition, the code generator generates the add(%i1%, %i2%) function call in place of the standard + operation for each addition of two uint8 values that yield one uint8 result. In doing so, the formal arguments %i1% and %i2% are replaced by the corresponding, concrete arguments (e.g. input_1 and input_2).
