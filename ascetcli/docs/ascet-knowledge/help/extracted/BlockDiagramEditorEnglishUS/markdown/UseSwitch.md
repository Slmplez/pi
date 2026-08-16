# Using the Switch

To use the [switch](BDE_switch.md), proceed as follows:

1. From the No. of arguments combo box of the Basic Blocks palette or toolbar, select the number of branches for the switch.
1. Click on the ![](button_op_switch.gif) Switch button to load the mouse cursor with the respective block.
1. Place the block in the drawing area.
1. To change the values for the alternative branches, right-click on the block and select Edit Literals from the context menu.
1. Connect the input at the top of the block to a limitInt or wrapInt (sdisc or udisc) element or to an enumeration.
1. Specify the actions for the branches.
1. Right-click on the sequence call you want to connect to a branch, and select Connector from the context menu.
1. Connect the desired branch to the connector.
1. Repeat these actions for the other branches.

![](3b8004.bmp) ![](bde_switch_enum.gif)

See also

[Switch](BDE_switch.md)

[Editing the Sequence Call in the Sequence Editor](EditSequence.md)
