# Direct Access Methods

Every public variable automatically adds two methods to the current object’s interface, which are referred to as direct access methods. A direct access method can be called to access the data in a public variable. It can be used for both read and write access to that variable.

In the following example, suppose that the VisibleObject has two public variables named free and all respectively. Method calls from outside can be as follows:

sdisc tmp = VisibleObject.all();

VisibleObject.free(120);

Direct access methods are generated automatically and added to the public interface of an object whenever a variable is declared public. These methods do not have to be coded explicitly.

See also

[Methods](ESDL_Methods.md)

[Methods with a Return Value](ESDL_Methods_with_a_Return_Value.md)

[Nested Methods](ESDL_Nested_Methods.md)

[This](this.md)

[Access Control](esdl_access_control.md)
