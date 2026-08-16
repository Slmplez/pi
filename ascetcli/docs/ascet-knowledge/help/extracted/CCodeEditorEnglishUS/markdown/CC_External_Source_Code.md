# External Source Code

Existing C code can be integrated by importing external C code source files. For this purpose, one C code file with a corresponding header file can be attached to each code variant of a component. The C code file contains standard C function definitions, the header file contains the corresponding function declarations and structure definitions. The defined functions can be called through the standard C conventions. It is possible to pass pointers and share defined structures between methods or processes of the component and the functions in the attached C code.

As an alternative to using a C code file, an object file with a corresponding header file can be attached to a component. Like the header files of the component itself, the range of the header files of the attached sources is local, i.e. they are copied into the generated C code.

The attached C file is compiled separately and linked to the other (generated and compiled) C source files. As a consequence, this compiled unit exists only once within any given context. If the code and the included data is shared between multiple instances of the same component, all instances share the same compiled unit.

The data in an attached C file is shared between multiple instances of the component, and not instantiated for each of the instances.

Additionally it is possible to have include statements in the C code. The include files however are not stored in the database/workspace, they are stored on the file system. The include statement must contain the file path to these include files. The C code therefore depends not only on items in the database/workspace but also on the file structure of the current installation. Therefore care has to be taken when exchanging data, since these files are not known to the ASCET system.

When using include files the user must take care of the correct references to these files on their own.

The figure indicates the use of external source code.

![](DIA0077.bmp)

See also

[Integrating an External Source File](integrating_external_source.md)
