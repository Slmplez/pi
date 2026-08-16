# Setting up a Hybrid Project

To set up a hybrid project, proceed as follows:

1. Set up the modules of the project as described earlier in this chapter.
1. Include the continuous time blocks you want.
1. Click on the Graphics tab of the project editor.
1. Drag the continuous time blocks and modules you want to include in the hybrid project into the drawing area.
1. Connect the CT blocks and the modules in the same way as elements in block diagrams.

You can change the layout of the components as described in [Layout of Included Components](BlockDiagramEditorEnglishUS.chm::/BDE_Layout.htm).

The communication between CT blocks and between continuous time blocks and modules is formed by graphical connections like those in block diagrams. In the current version of ASCET you can also connect modules in this way. The connecting lines between modules, however, have no influence on the communication between modules (which is always determined via the name-based binding mechanism described earlier). Connecting lines between modules are interpreted as comment lines and can be used for illustration. The color of comment lines is set in the ASCET option window (see [Colors Options](ComponentManagerEnglishUS.chm::/CM_Color_Settings.htm)).

All the tasks required for working with CT blocks are created automatically. No additional tasks can be created for the activation of CT blocks. The initialize and terminate_CT tasks are created only once for the whole hybrid project. Additionally, a simulate task and an event task are created for each CT block in the model. These tasks are set up like any other task (see [Basic Task Settings](basictasksetting.md)).

See also

[Layout of Included Components](BlockDiagramEditorEnglishUS.chm::/BDE_Layout.htm)

[Basic Task Settings](basictasksetting.md)

[Setting up a Trigger Mode](triggermode.md)

[ASCET Options - Colors Options](ComponentManagerEnglishUS.chm::/CM_Color_Settings.htm)
