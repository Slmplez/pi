# Continuous Time Blocks as Block Diagrams

A CT block specified as a block diagram consists mainly of basic blocks which are then connected graphically to form a larger assembly. Specifying the diagram is very similar to specifying classes, the most important differences are listed below:

1. There are only four operators available: addition, subtraction, multiplication and division. If more complex non-linear operators are required, they can be specified as separate blocks.
1. The basic elements that can be defined in a CT block are different, with the exception of characteristic lines and fields. These work in the same way as in classes. The basic elements that can be defined in CT blocks are discussed in [Block Interfaces (Structure Blocks)](CTB_Summary_Structure_Block_Interfaces.md).
1. There is only one diagram in a CT block, additional diagrams cannot be defined. The diagram can be hierarchical, however.
1. Interfaces need not be defined. A set of methods is predefined when the CT block is created. These cannot be changed and additional methods cannot be defined.
1. Only classes and other CT blocks can be referenced. Classes can only be used to define records, not to specify functionality. When a class is referenced, you are asked whether it is to be used as an input or an output.
1. There are no sequence calls in a CT block. The order for evaluation is determined automatically.

Apart from these considerations, all the block diagram editor features work in the same way as for classes, and all the commands available here have the same effect.
