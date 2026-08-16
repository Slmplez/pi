# Components with Multiple Diagrams

A component specification for a class or module can consist of more than one diagram. This feature is useful for structuring complex specifications. A diagram can either be public, i.e. contain only public methods and processes, or private, i.e. contain only private methods.

Public methods can be accessed from other components, private methods cannot. Private methods can only be accessed from inside the component. Private diagrams containing actions and conditions are a special case. These are used in state machines only.

Each component specified as block diagram contains at least one public diagram named Main. Classes can have any number of public or private diagrams, whereas modules only have public diagrams.

See also

[Creating a New Diagram](BDE_Createnew.md)

[Loading a Diagram](LoadDiagram.md)

[Renaming or Deleting a Diagram, Method or Process](RenameorDelete.md)

[Moving Methods between Diagrams](MoveMethods.md)

[Navigating between Components](NavigatingComponents.md)
