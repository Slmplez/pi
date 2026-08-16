# Block-Local Sequence Calls

The sequence calls inside a [statement block](BDE_StatementBlocks.md) are local to that block. They consist of a sequence number and the name of the enclosing statement block. (Normal sequence calls consist of a number and a method/process name.)

The following rules apply:

- A block-local sequence call must not be used outside its enclosing statement block.

If a block-local sequence call is used outside its statement block (e.g., in the main diagram, in a different statement block, or in a graphical hierarchy inside or outside the statement block), an error is issued during code generation:

YBdl74 - Statement block-local sequence call used in %1

with %1 being top level diagram, different executable hierarchy named %2, or different regular hierarchy named %2.

- Only block-local sequence calls are allowed in a statement block.

If a normal sequence call is used in a statement block - either directly or indirectly (i.e. in a graphical hierarchy inside the statement block) -, a warning is issued during code generation:

WBdl30 - Method sequence call should not be used inside a statement block

You can convert a block-local sequence call to a connector and vice versa, see [Toggling Between Connector and Block-Local Sequence Call](BDE_Convert_Connector_SequenceCall.md).

See also

[Statement Blocks](BDE_StatementBlocks.md)

[Sequence Calls](BDE_SequenceCalls.md)

[Toggling Between Connector and Block-Local Sequence Call](BDE_Convert_Connector_SequenceCall.md)
