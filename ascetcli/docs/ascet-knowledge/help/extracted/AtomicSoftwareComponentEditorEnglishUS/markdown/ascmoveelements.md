# Moving Elements Into/Out of a Hierarchy or Statement Block

It is not possible to move diagram items into a hierarchy block directly, e.g. by drag-and-drop. They always have to be copied via the clipboard or moved as described here. To move elements into or out of a hierarchy frame, proceed as follows:

1. Use Cut or Copy to copy/move diagram elements to the clipboard.
1. Double-click on the hierarchy or statement block that is to contain the elements.
1. Use Paste to insert the diagram elements.
1. Edit the pasted sequence calls.
1. Double-click in the drawing area to return to the higher level.

Copying or moving existing elements from a hierarchy or statement block to a higher diagram level is done accordingly. The following happens to copied/moved sequence calls in that case:

- If you copied the elements from a hierarchy, the sequence calls are reset.
- If you copied the elements from a statement block, the block-local sequence calls are converted into connectors.

See also

[Graphical Hierarchies in SWC](ascgraphicalhierarchies.md)

[Statement Blocks](asc_statementblocks.md)

[Using Graphical Hierarchies and Statement Blocks](ASC_UseGraphicalHierarchies_StatementBlocks.md)
