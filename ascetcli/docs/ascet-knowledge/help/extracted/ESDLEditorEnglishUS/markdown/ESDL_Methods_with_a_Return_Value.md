# Methods with a Return Value

A method call can return a value, which can in turn be assigned to a variable in the method call. The variable must be of the same type as the return value.

aNumber =anArray. getAt(index); //assign value from index position

anOffset =loader. resolve(true, 2.14); //assign value for 2.14, calculate using characteristic

If a method has a return value, the method body must be terminated with a return statement. The return statement can be followed by any expression that evaluates to the return type of the method.

return in.between(ub, lb); // returns a logical value

return intVar; //returns the value of intVar

A method call can return only a single value. If more than one value is to be passed on between modules or objects, an object can be used to hold these values (see [Structures](ESDL_Structures.md)).

Method calls cannot be nested in ESDL. The following statement is illegal:

loader.resolve(true, 2.14).sqrt();

It must be replaced with the following, legal statement:

aNumber = loader.resolve(true, 2.14);

aNumber.sqrt();

See also

[Methods](ESDL_Methods.md)

[Nested Methods](ESDL_Nested_Methods.md)

[This](this.md)

[Access Control](esdl_access_control.md)

[Direct Access Methods](ESDL_Direct_Access_Methods.md)
