# The Interface of Modules

The interface of a module consists of a number of processes and—optional—methods, as well as the messages used in that module. Modules interact at two different levels, since the activation of processes and the communication via messages is separated. The activation of the process is under control of the operating system (that is part of the project).

The communication between processes via messages is asynchronous to the activation of the processes, i.e. the sending of a message and the receiving of it in a process do not happen at the same time. This concept is different from parameter passing between methods, which is synchronous to calling the method.

Like methods, processes can have temporary process-local variables. The figure below shows inter-process communication (grey parts are optional).

![](DIA0064.bmp)

See

[The Interface of Classes](int_the_interface_of_classes.md)

[Overview - Component Interface](INT_Overview_ComponentInterface.md)

[Messages](INT_messages.md)
