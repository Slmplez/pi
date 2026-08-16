# Using the Switch Operator

To use the [switch](ASCcontrolFlowOperators.md), proceed as follows:

1. From the No. of arguments combo box of the Basic Blocks palette or toolbar, select the number of branches for the switch.

You must select at least two branches. The default branch is not counted. You can adjust the number of branches later via the Add Condition and Remove Condition options in the context menu of the Switch block.

1. Click on the ![](buttonOpSwitch.gif) button to load the mouse cursor with the respective block.
1. Place the block in the drawing area.
1. To change the values for the alternative branches, right-click on the block and select Edit Literals from the context menu.

An editor window opens, it contains one input field for each branch.

1. In the Literals field, enter the values for the branches.
1. Click OK to accept the changes.

1. Connect the input at the top of the block to a limitInt or wrapInt (sdisc or udisc) element.

If you connect the input to a cont pin, an error of type MMdl63 is displayed during code generation.

1. Specify the actions for the branches.
1. Right-click on the sequence call you want to connect to a branch, and select Connector from the context menu.

1. Connect the desired branch to the connector.

You can connect a branch to more than one actions. In that case, edit the connector numbers (according to [Editing the Sequence Call in the Sequence Editor](ASCEditSequence.md)). As for sequence calls, each number must be unique.

1. Repeat these actions for the other branches.

![](3b8004.bmp) ![](bde_switch_enum.gif)

See also

[Control Flow Operators](ASCcontrolFlowOperators.md)

[Editing the Sequence Call in the Sequence Editor](ASCEditSequence.md)
