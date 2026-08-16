# Definition and Instantiation of Components

A component describes an abstract data type, it makes available an interface, through which it interacts with its environment. When using a component in a project, each element has to be created, i.e. for each element real memory cells have to be allocated. The process of creating an object is also called instantiation. Upon instantiation, the necessary data structure is built and initialized.

Each instance of a component has its own set of elements, but inherits the interface and the functional description from the component itself.

![](DIA0058.bmp)

The definition of a component is therefore the definition of a template for the instantiated components. The difference between template and instance is not obvious for modules, since modules only have one occurrence in a project context, i.e. modules are only instantiated once. There is a one-to-one relation between the template and the instance for modules.

![](DIA0059.bmp)

Classes, on the other hand, can have multiple instances. Here, the distinction between definition and instantiation becomes more obvious, since there is no simple one-to-one relation between template and instance. The relationship can be 1:n. The definition of a class is therefore the definition of a reusable, user-defined model type.

The instantiation of a component only works in the context of a project. Thus, when working with components only, a default project is automatically created to provide the context for instantiating the components.

When using a class in another component (See [Overview - Component Interface](INT_Overview_ComponentInterface.md)), the class is instantiated in the context of that component, when that component is instantiated. In contrast to this, modules are always instantiated in a project.

See

[Overview - Component Interface](INT_Overview_ComponentInterface.md)
