# Using the While Loop

The only loop construct available in block diagrams is the While loop. To use the While loop, proceed as follows:

1. In the Basic Blocks palette or toolbar, click on the ![](buttonWhile.gif) button to load the mouse cursor with the respective block.
1. Place the block in the drawing area.
1. Specify the loop condition.
1. Connect the condition to the loop input.

![](bde_while1%20copy.gif)

1. Specify the loop action.
1. Right-click on the sequence call you want to connect to the loop output, and select Connector from the context menu.

The sequence call becomes a connector.

1. Connect the loop output to the connector.

![](3b8003.bmp)

You can connect the output to more than one actions. In that case, edit the connector numbers (according to [Editing the Sequence Call in the Sequence Editor](ASCEditSequence.md)). As for sequence calls, each number must be unique.

Make sure that you avoid infinite loops or loops unsuitable for real-time applications, e.g., via an appropriate setting for Max Number of Loop Iterations in the project properties, Experiment Code node, of the associated project.

See also

[Editing the Sequence Call in the Sequence Editor](ASCEditSequence.md)

[Project Editor - Experiment Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)
