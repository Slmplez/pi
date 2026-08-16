# Modules vs. Classes

Classes do not support real-time interprocess communication via messages. This has two reasons. Firstly, classes can have multiple instances and the data consistency scheme of ERCOSEK cannot manage multiple instantiations. Secondly, processes are assigned statically to one fixed task. Whenever a process runs, the operating system creates copies of all its messages. These copies are accessible only to that instance of the process that created them. Hence, if the same message is used by various processes, each process gets its own copy of the message. This strategy is used by the real-time operating system to ensure data consistency over multiple processes.

Methods, on the other hand, can be called arbitrarily from different points in the program, for instance from different processes in different tasks. The method does not "know" the calling task. Thus, it cannot be decided which message copy is relevant for which method call.

The properties of modules and classes are summarized in the following table.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Property | Module | Class |
| Processes | x |  |
| Methods | x | x |
| Argument passing |  | x |
| Messages | x |  |
| Multiple instances |  | x |
| Hierarchical design | x | x |

When specifying components, modules as well as classes, the structure is often hierarchical, since other previously defined classes or modules are to be reused.

See

[Modules](int_modules.md)

[Classes](INT_Classes.md)

[Messages](INT_messages.md)
