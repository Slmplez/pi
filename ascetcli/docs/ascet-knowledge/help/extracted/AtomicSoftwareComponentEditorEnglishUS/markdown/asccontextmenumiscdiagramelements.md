# Context Menu Miscellaneous Diagram Elements

Right-clicking a diagram element opens a context menu.

- [elements](ASCcontextMenuElements.md) and [included components](ASCcontextMenuComponents.md)
- [operators](ASCcontextMenuOperators.md) and [control flow elements](ASCcontextMenuControlFlowOperators.md)
- [graphical hierarchies and statement blocks](#graphicalHierarchy)
- [connections](#connections)
- [sequence calls](#graphicalHierarchy)

## Graphical Hierarchies and Statement Blocks

Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) options dialog window. All available views are listed, and the visibility of the diagram element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

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

[Adds an output pin or input pin](ascaddinputhiera.md) to the block.

Resolve Hierarchy or Resolve Statement Block

Removes the graphical hierarchy or statement block and adds the elements in the hierarchy to the current diagram level (see [Resolving a Hierarchy/Statement Block](ascresolvinghierarchy.md)).

Next Level

Displays the inside of the graphical hierarchy or statement block (see [Navigating between Hierarchy/Statement Block Levels](ascnavigatehierarchy.md))

## Connections

View

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) options dialog window. All available views are listed, and the visibility of the diagram element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

Add Implementation Cast

[Inserts an implementation cast](ascaddimplcasttoconnect.md) into the connection.

Browse Connected Elements

[Browses the elements](ascviewconnectedelements.md) at both ends of the connection.

## Sequence Calls

Next Number

Assigns the next free number to the sequence call (see [Automatically Assigning Individual Sequence Calls](ASCassignindividual.md)).

Edit

Opens the sequence editor (see [Editing a Sequence Call in the Sequence Editor](ASCEditSequence.md)).

Change

The submenus Reset, Increment, Decrement and Shift by offset can be used to change the sequence number (see [Incrementing/Decrementing Individual Sequence Calls](ASCIncrementordecrement.md), [Resetting an Individual Sequence Call](ASCResetindividual.md) and [Shifting Several Sequence Calls](ascshiftsequence.md)).

Connector

Converts the sequence call or block-local sequence call into a connector (see [Creating and Removing Connectors](asccreateconnectors.md)).

Block-local sequence call

Only available for sequence calls in statement blocks.

Converts the connector into a block-local sequence call. See also [Statement Blocks](asc_statementblocks.md).

Atomic

The submenus Start and Stop can be used to [create a sequence of protected sequence calls](ASCCreatesequence.md).

Select Complete Port

Shows the complete port that belongs to the sequence call (see [Changing the Visibility of Individual Sequence Calls](ASCChangevisibility.md)).

Hide

Hides the sequence call (see [Changing the Visibility of Individual Sequence Calls](ASCChangevisibility.md)).

Set to default position

Moves the sequence call to its default position.

Create ASCET Link

Only available for assigned sequence calls, block-local sequence calls, and connectors.

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the element that provides the selected sequence call, block-local sequence call or connector in the drawing area.
