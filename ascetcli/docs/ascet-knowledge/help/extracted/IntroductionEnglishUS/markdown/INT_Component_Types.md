# Kinds of Components

The following kinds of components exist: modules and classes. A central aspect in the design of these types is data encapsulation, where ASCET follows an object-oriented approach. A component contains a number of elements that can be used by all processes or methods defined in that module or class. The scope of these elements can be restricted to be local. Even for messages (available in modules only), the scope can be restricted to processes defined within that module only.

A component specification consists of:

- The content of the component, i.e. declarations of the variables, parameters etc. the component uses.
- The interface of the component in the form of processes or methods. This interface can be extended by allowing access to internal variables (of classes) and messages (used in modules) directly.

- The algorithms themselves, which specify the computations within a process or method.

![](DIA0057.gif)

See also

[Modules](int_modules.md)

[Classes](INT_Classes.md)

[Modules vs. Classes](INT_Modules_vs._Classes.md)
