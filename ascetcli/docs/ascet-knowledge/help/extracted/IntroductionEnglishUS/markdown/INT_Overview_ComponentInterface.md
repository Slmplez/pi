# Overview - Component Interface

The interface of a component consists of methods, processes, and the access to global variables. Modules, for instance, have access to messages. Methods and processes are structured in the same way. Their structure is independent of the way the methods or processes are described.

Each method or process is assigned to a diagram, where each diagram can either be public or private. Methods assigned to private diagrams are only visible inside the component and do not belong to the public interface of the component, which is visible to other components. All methods assigned to one diagram are described in this diagram (in the case of block diagrams, there is a common block diagram for all these methods).

![](DIA0060.bmp)

See

[The Interface of Classes](int_the_interface_of_classes.md)

[The Interface of Modules](INT_The_Interface_of_Modules.md)
