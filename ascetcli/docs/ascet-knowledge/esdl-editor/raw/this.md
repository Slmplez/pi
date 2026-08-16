# This

The pseudo-identifier this can be used in ESDL to call a method at the current component. If, for example, you want to call the private method initCounter at the current object, you can use the following statement:

this.initCounter();

If the initCounter method has a return value, you can assign it as follows:

aValue = this.initCounter();

The reference to the current object using the this identifier is optional in both these cases because it is implicit in the context. Hence, the above statements can be written as follows:

initCounter;

aValue = initCounter();

Only if the current object is to be passed on as a parameter to another method, is the reference using this needed.

OtherObject.evaluate(this);

Here, the identifier this passes on a reference to the current object.

While ESDL accepts both the self and the this identifier, it is recommended to use this to ensure compatibility with Java syntax.

See also

[Methods](ESDL_Methods.md)

[Methods with a Return Value](ESDL_Methods_with_a_Return_Value.md)

[Nested Methods](ESDL_Nested_Methods.md)

[Access Control](esdl_access_control.md)

[Direct Access Methods](ESDL_Direct_Access_Methods.md)
