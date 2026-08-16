# Structures

In ESDL, structures (or records) are modelled using classes. A class can be used as a complex container element which holds any number of variables. If a variables in a class is public, it can be read and written to from ESDL using direct access methods.

Classes that are used as container elements are accessed in the same manner as other classes in ESDL. The first step is always to add the class to the Elements list of the ESDL Editor to make it available in the context of the current class. Variables can be declared public in the Layout Editor for the parent object.

The variables can then be accessed from within ESDL using the simple direct access method syntax:

theVar = VisibleObject.aVar() VisibleObject.aVar(5.12); // read/write access to primitive variable

theVar = VisibleObject.anArray().getAt(2) VisibleObject.anArray().setAt(2.14, 3); // read/write access to array variables

For group tables and distributions, this procedure does not work.

In ESDL, classes can be nested to model self-referential structures.

A complex assignment such as VisibleObject.anArray(myArray) is not legal in ESDL, it does not assign the values in the myArray parameter to the anArray element. Complex statements can, however, be used to pass on a reference to another object.
