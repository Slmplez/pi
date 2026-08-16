# Global Communication

In components, the flow of data is organized through the interface elements of the components, i.e. by defining inputs and arguments and reading outputs and return values. In a project, communication is defined via imported and exported elements, these function like global variables. These elements are mapped onto each other according to their names, which have to be identical for two elements to be mapped. Therefore, it is necessary to assign the names in the modules so that they will match in the project.

An element can be exported either by a module or by the project itself. Each exported element can be imported several times by other modules, but an element can only be exported once. If two modules within a project contain an exported element of the same name, an error message is displayed.

Elements can also be created in the project. They are then linked to elements with the same name in the modules. Binding is always automatic, i.e. the user can only influence the binding of imported and exported elements by assigning matching names to them.

See also

[Viewing the Binding of Variables in a Project](viewbinding.md)

[Opening a Component from the Binding Tab](opencomponent.md)

[Defining Global Elements in a Project](defineglobal.md)

[Searching/Deleting Unused Global Elements](deleteunused.md)
