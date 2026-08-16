# Memory Classes for Redundant Data Storage

By default, the complement representation is stored in the same memory class as the original. However, an associated memory class for redundant data storage can be specified for each memory class in the memory class declaration file, e.g. memorySections.xml file, via a <redundantMemClass> element:

<MemClass>

<name>A</name>

...

<redundantMemClass>B</redundantMemClass>

</MemClass>

If <redundantMemClass> is defined, complements are stored in memory class B if their originals are stored in memory class A.

[Example](INT_Example_MemClassRedundantDataStorage.md)

Only memory classes declared in memorySections.xml can be used as <redundantMemClass>. If an undeclared class name is used as <redundantMemClass>, an error is issued during code generation.

ECCg41 - Memory class <"undeclared class" used as "Default"> specified for element <complement name> is not declared in file "target path\memory class declaration file" - Please add declaration

See also

[Example: Memory Class for Redundant Data Storage](INT_Example_MemClassRedundantDataStorage.md)

[Redundant Data Storage](INT_RedundantDataStorage.md)

[Code Generation with Redundant Data Storage](INT_CodeGen_RedundantDataStorage.md)
