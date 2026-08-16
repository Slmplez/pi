# Access Control

In ESDL, both the methods and variables of a class can be declared as either public or private to control access to these elements and hide their implementation from other objects.

Private methods can be called and private variables manipulated only from within the current object. By contrast, public methods can be called and public variables accessed from both within and outside the current object.

Methods are declared public or private by assigning them to a corresponding diagram in the ESDL Editor. The default for new objects is to have a single public diagram Main which contains the calc method.

Users can create additional public methods in the same diagram or add a new diagram. Private methods must be created as part of a private diagram. The access rights to a method can be changed by moving it from one diagram to another.

An object Caller can access the public interface of another object Receiver if the latter has been imported by adding it to the Elements list for Caller.

New variables are created as private when they are added to the Elements list in the ESDL editor. They cannot be accessed from outside the current object. The status of a variable can be modified only in the element editor for that object (see [Editing an Element Configuration](../../element-editor/raw/EEd_edit_element_configuration.md)).

See also

[Methods](ESDL_Methods.md)

[Methods with a Return Value](ESDL_Methods_with_a_Return_Value.md)

[Nested Methods](ESDL_Nested_Methods.md)

[This](this.md)

[Direct Access Methods](ESDL_Direct_Access_Methods.md)

[Editing an Element Configuration](../../element-editor/raw/EEd_edit_element_configuration.md)
