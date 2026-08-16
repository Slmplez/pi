# Element Name Type Mismatch

Type mismatch: expected <type_A> [<name_A>], got <type_B> [<name_B>]

##### Description:

An element with name name_B of type_B is assigned to a variable with name name_A of type type_A where type_B can not be cast to type_A. E.g. an element of type cont is assigned a variable of type logical. Presumably the connection is wrong.

##### Solution:

Change the type of the element or make a correct connection.
