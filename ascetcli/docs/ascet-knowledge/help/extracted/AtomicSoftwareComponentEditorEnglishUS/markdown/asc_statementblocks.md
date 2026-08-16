# Statement Blocks

Statement blocks can be used to encapsulate a continuous set of statements.

Each statement block must have an unambiguous name. If a statement block has the same name as another statement block, a normal hierarchy, a method, process, or runnable, an error is issued during code generation.

YBdl75 - Duplicate name "<name>" for statement block

A statement block is very similar to a graphical hierarchy, except that

- a statement block has a sequence call, and
- sequence calls inside a statement block are local to that block (see [Block-Local Sequence Calls](asc_blocklocalsequencecalls.md)).

Changing the block's sequence call does not change the execution sequence within the block. During code generation, the statement block is generated in the place indicated by the block's sequence call. The content of the statement block is generated in the order determined by the block-local sequence calls (see [Example: Statement Block](asc_examplestatementblock.md)).

Data flow between the various hierarchy/statement block levels works via input and output pins. These are simply connection lines that extend across the levels. In statement blocks, input and output pins are not intended for control flow. If a control-flow element is connected to the input pin of a statement block, an warning is issued during code generation.

WBdl31 - A statement block should not have a control-flow pin

By default, this warning is promoted to an error.

See also

[Block-Local Sequence Calls](asc_blocklocalsequencecalls.md)

[Example: Statement Block](asc_examplestatementblock.md)

[Graphical Hierarchies in SWC](ascgraphicalhierarchies.md)

[Using Graphical Hierarchies and Statement Blocks](ASC_UseGraphicalHierarchies_StatementBlocks.md)
