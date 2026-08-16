# Software Components with Multiple Diagrams

The specification for a software component can consist of more than one diagram. This feature is useful for structuring complex specifications. A diagram can either be public, i.e. contain only public runnables and methods, or private, i.e. contain only private runnables and methods.

Public methods can be accessed from other components, private methods cannot. Private methods can only be accessed from inside the component.

Each software component contains at least one public diagram named Main. It can have any number of public or private diagrams.

See also

[Creating a New Diagram](asccreatediagram.md)

[Loading a Diagram](ascloaddiagram.md)

[Renaming or Deleting a Diagram, Runnable or Method](ascrenameordelete.md)

[Moving Runnables and Methods between Diagrams](ascmoveRunnablesMethods.md)
