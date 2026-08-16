# Specifying the Memory Location for State Variables

Code generation for a state machine may generate, depending on the option [Hierarchical Code Generation](ProjectEditorEnglishUS.chm::/PE_Statemachine_Options_Window.htm) and the use of hierarchy states with history flag, several [state variables](StateMachineEditorEnglishUS.chm::/SM_StateVariables.htm). Only one of them, the sm variable, is visible in the state machine editor; this variable is used to specify memory location and cache locking for all state variables. Proceed as follows:

1. Open the implementation editor for the sm variable (![](icon_smvariable.gif)), e.g. as described in [Opening the Implementation Editor for an Element (B)](IEd_open_impleditor_for_element.md).
1. In the Memory Location of Instance combo box, select the memory area where the element is located.
1. In the Additional Info tab, enter information for your code generator.

This information is only for documentation purposes.

If you want to set up cache locking (only for ASCET-RP with ES1135), see [ES1135: Cache Locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm) and references therein.

If you want to specify memory segments, see the ASCET-SE user's guide, chapter "Memory Segments", for details.

See also

[State Machine Editor - State Variables](StateMachineEditorEnglishUS.chm::/SM_StateVariables.htm)

[Project Editor - Statemachine Node](ProjectEditorEnglishUS.chm::/PE_Statemachine_Options_Window.htm)

[Opening the Implementation Editor for an Element (B)](IEd_open_impleditor_for_element.md)

[Opening the Implementation Editor for an Element (A)](IEd_open_impl_editor.md)

[Opening the Implementation Editor for an Element (C)](IEd_open_compo_project.md)
