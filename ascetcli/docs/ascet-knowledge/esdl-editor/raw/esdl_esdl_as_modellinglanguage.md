# ESDL as a Modelling Language

ESDL was designed specifically as a modelling language for the automotive environment. In ASCET, it is used to specify the method or process bodies within classes or modules. For simplicity, classes and modules are subsumed under the term classes in this section.

In ESDL, both the syntax and elements are based on the Java programming language to provide for a low learning curve. When working with ESDL, however, it is important to keep in mind that ESDL is radically different from other languages.

The main characteristics, which in part distinguish ESDL from other languages, are as follows:

- ESDL is a modelling language, not a programming language. It is a modeling language that works on the same abstract, physical level of description as the block diagrams commonly used in ASCET. Concepts that are related to or dependent on implementation, such as pointers or shift operators, are not available.
- ESDL is used for systems that run in a real-time environment. Hence, it must meet the requirements of real-time operation. As a consequence, ESDL is as object-oriented as these parameters permit. The model structure can be mapped to classes and modules, but instantiation is static and there is no inheritance.
- ESDL is used to build automotive software. While users can build complex software models in ESDL, concepts that are currently not relevant to embedded systems, such as string operations, are not implemented.
- ESDL ties in seamlessly with the ASCET development environment. The language is used at the same level as block diagrams, that is, for describing the functions contained in method or process bodies. Import of elements and variable declaration are performed using the corresponding tools in the ESDL editor.

These four main characteristics of ESDL determine the scope and usage of the language. Otherwise ESDL can—more or less—be seen as a highly specialized variant of the Java programming language.

See

[Working with Methods and Processes](esdl_working_with_methods_and_processes.md)

[ESDL Syntax](ESDL_ESDL_Syntax.md)

[Implementation Casts in ESDL](ESDL_Implementation_Casts_in_ESDL.md)

[Methods](ESDL_Methods.md)

[Overview - Composite Data Types](ESDL_Overview_-_Composite_Data_Types.md)

[Literals and Constants](literals_and_constants.md)

[Comments](ESDL_Comments.md)

[Structures](ESDL_Structures.md)

[Messages](ESDL_Messages.md)

[Mathematical Functions](ESDL_Mathematical_Functions.md)

[Specifying Modules in ESDL](specifying_modules.md)
