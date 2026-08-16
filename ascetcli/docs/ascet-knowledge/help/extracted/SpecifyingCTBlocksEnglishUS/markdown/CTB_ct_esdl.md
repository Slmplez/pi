# Continuous Time Blocks in ESDL

Specifying CT blocks in ESDL is similar to specifying classes with the exception of the following differences:

1. The basic elements that can be defined in a CT block are different, with the exception of characteristic lines and fields. These work in the same way as in classes. The basic elements that can be defined in CT blocks are discussed in [Summary - Basic Block Interface](CTB_summary.md).
1. There is only one diagram in a CT block, additional diagrams cannot be defined.
1. Interfaces need not be defined. A set of methods is predefined when the CT block is created. These cannot be changed and additional methods cannot be defined.
1. Only classes and other CT blocks can be referenced. Classes can only be used to define records, not to specify functionality. When a class is referenced, you are asked whether it is to be used as an input or an output.

The same basic elements are available in ESDL as for CT blocks specified in C code. The two types of blocks serve the same purpose.

See also

[Creating a Continuous Time Block in ESDL](CTB_create_ctb_in_esdl.md)

[Summary - Basic Block Interface](CTB_summary.md)
