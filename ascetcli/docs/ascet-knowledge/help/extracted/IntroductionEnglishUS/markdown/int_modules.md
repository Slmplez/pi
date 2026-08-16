# Modules

When specifying an embedded control system, the real-time requirements of the system are crucial. In order to meet these requirements, special components with a real-time capable interface, modules, can be used in ASCET.

A module defines a number of processes; in addition, methods can be defined. A process contains a piece of code, that is executed sequentially. Processes are activated by the operating system, no parameters can be passed. Instead, modules use messages for data exchange, i.e. direct access to a global variable space, which results in a highly efficient communication mechanism.

Unlike processes, which are activated only by the operating system, methods are much more flexible. Each method can have an arbitrary (but fixed) number of arguments and a single return value.

The behavior of modules is unique within an embedded control system in the sense that they can be instantiated only once in the context of a project.

See also

[Classes](INT_Classes.md)

[Modules vs. Classes](INT_Modules_vs._Classes.md)

[Messages](INT_messages.md)
