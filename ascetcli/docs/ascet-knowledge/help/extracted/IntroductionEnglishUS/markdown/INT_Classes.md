# Classes

To avoid the limitation of modules, which can be instanciated only once in a project, classes can be used. Classes are object-oriented abstract data types that encapsulate data and make available a well defined interface. The interface is a collection of methods, which can be called from anywhere inside the program. Unlike processes, which can only be activated by the operating system, methods are much more flexible. Each method can have an arbitrary (but fixed) number of arguments and a single return value.

Classes can be instantiated more than once, e.g. more than one accumulator class can exist in a project. Each instance of a class has its own data space (its own parameters and variables), but all instances share the same specification. Global variables defined in classes are the same for all instances of a class (and, in an object-oriented view, can be considered to be class variables), but they can also be accessed by other components.

State machines are a special type of class available in ASCET. Their semantic behavior is the same as that of classes, but the notations are different. State machines, for example, have special methods for computing the conditions of a state transition.

See

[Modules](int_modules.md)

[Modules vs. Classes](INT_Modules_vs._Classes.md)
