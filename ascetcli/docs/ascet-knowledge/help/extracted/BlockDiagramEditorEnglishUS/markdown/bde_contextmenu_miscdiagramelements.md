# Context Menu - Miscellaneous Diagram Elements

Right-clicking a diagram element opens a context menu.

- [elements and included components](bde_contextmenu_elementincludedcomponent.md)
- [operators and control flow elements](BDE_ContextMenu_OperatorsControlflow.md)
- [graphical hierarchies and statement blocks](#graphicalHierarchy)
- [connections](#connections)
- [sequence calls](#sequenceCalls)

## Graphical Hierarchies and Statement Blocks

Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) dialog window. All available views are listed, and the visibility of the graphical hierarchy or statement block in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

Create ASCET Link

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the selected hierarchy/statement block in the drawing area.

Rename Hierarchy or Rename Statement Block

Renames the block.

Change Icon

Adds an icon to the block.

Remove Icon

Removes the icon from the block.

Fill Color

Sets the fill color of the block.

Show/Hide Name

Shows/hides the name of the block.

Show Pin Names and Hide Pin Names

Shows or hides the names of input and output pins.

Set to Default Size

Resets the size of the block to the default value.

Add Outpin and Add Inpin

[Adds an output pin or input pin](Addinputhiera.md) to the block.

Resolve Hierarchy or Resolve Statement Block

Removes the graphical hierarchy or statement block and adds the elements in the block to the current diagram level (see [Resolving a Hierarchy or Statement Block](Resolvinghierarchy.md)).

Next Level

Displays the inside of the graphical hierarchy or statement block (see [Navigating Between Hierarchy/Statement Block Levels](Navigatehierarchy.md)).

## Connections

View

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) dialog window. All available views are listed, and the visibility of the diagram element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

Add Implementation Cast

[Inserts an implementation cast](Addtoconnect.md) into the connection.

Browse Connected Elements

[Browses the elements](ViewItem.md) at both ends of the connection.

## Sequence Calls

Next Number

Assigns the next free number to the sequence call (see [Automatically Assigning Individual Sequence Calls](Assignindividual.md)).

Edit

Opens the sequence editor (see [Editing a Sequence Call in the Sequence Editor](EditSequence.md)).

Change

The submenus Reset, Increment, Decrement and Shift by offset can be used to change the sequence number (see [Incrementing/Decrementing Individual Sequence Calls](Incrementordecrement.md), [Resetting an Individual Sequence Call](Resetindividual.md) and [Shifting Several Sequence Calls](ShiftSequence.md)).

Connector

Converts the sequence call or block-local sequence call (in a statement block) into a connector (see [Creating Connectors](CreateConnectors.md)).

Block-local sequence call

Only available for sequence calls in statement blocks.

Converts the connector into a block-local sequence call. See also [Statement Blocks](BDE_StatementBlocks.md).

Atomic

The submenus Start and Stop can be used to [create a sequence of protected sequence calls](Createsequence.md).

Select Complete Port

Shows the complete port that belongs to the sequence call (see [Changing the Visibility of Individual Sequence Calls](Changevisibility.md)).

Hide

Hides the sequence call (see [Changing the Visibility of Individual Sequence Calls](Changevisibility.md)).

Set to default position

Moves the sequence call to its default position.

Create ASCET Link

Only available for sequence calls, block-local sequence calls, and connectors with sequence number > 0.

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the element that provides the selected sequence call in the drawing area.
