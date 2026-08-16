# Type Conversion

Whenever a basic arithmetic operator like +, -, *, / has operands of different types, the result is automatically converted to that of the strongest type used in the expression.

The order of types is (from weak to strong): sdisc, udisc, cont.

cont result = varUdisc + varCont;

When assigning a value to a variable the data types must match. There is no explicit type casting. Only for the basic arithmetic types signed discrete, unsigned discrete and continuous does ESDL perform an implicit conversion.

cont tmp = 2;

A conversion of boolean and arithmetic types is not possible.

See also

[Working with Methods and Processes](esdl_working_with_methods_and_processes.md)

[ESDL Syntax](ESDL_ESDL_Syntax.md)

[Variable Names](ESDL_Variable_Names.md)

[Data Types](ESDL_Data_Types.md)

[Primitive Methods](ESDL_Primitive_Methods.md)

[Implementation Casts in ESDL](ESDL_Implementation_Casts_in_ESDL.md)
