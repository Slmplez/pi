# Creating a Continuous Time Block in C Code

To create a continuous time block in C code, proceed as follows:

1. In the Component Manager, select the folder for the new block.
1. In the Insert menu, point to Continuous Time Block and select C Code.
1. Type in a name for the component and press Enter.
1. Do one of the following:
1. Select direct or nondirect from the right combo box in the button bar.
1. Type in the code or import external modules as required.

Using the C code editor is described in detail in [C Code Editor](CCodeEditorEnglishUS.chm::/CC_Overview.htm).

CT blocks specified in C code support either direct or nondirect outputs, but not both. You can set this in the Block Behavior combo box. If you selected direct, only the directOutputs[] method is available, with nondirect only the nondirectOutputs[] method is available. See [Algebraic Loops](CTB_Algebraic_Loops.md) for details on direct and nondirect outputs.

See also

[C Code Editor - Overview](CCodeEditorEnglishUS.chm::/CC_Overview.htm)

[Algebraic Loops](CTB_Algebraic_Loops.md)
