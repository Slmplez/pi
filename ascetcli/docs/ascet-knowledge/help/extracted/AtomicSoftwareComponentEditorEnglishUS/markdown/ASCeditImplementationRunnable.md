# Editing the Implementation of a Runnable

To edit the implementation of a runnable, proceed as follows:

1. Open the specification editor for the desired SWC.
1. In the Outline tab, select the runnable you want to edit.
1. Do one of the following:
1. Activate the Use FPU option if you want to save the Floating Point Unit registers of your microcontroller target upon task switching.
1. From the Memory Location combo box, select the memory area where the code should run.
1. Accept the default setting in the Memory Segment combo box.
1. In the Symbol field, enter the character string you want to use as C function name for the runnable entity in the currently selected implementation of the SWC.

Valid strings are any valid C identifier, any sequence of ASCET naming macros (see the list in [Implementation Editor for Methods/Processes/Runnables](ImplementationEditorEnglishUS.chm::/ied_implementation_editor_methodsprocesses.htm)), or any combination thereof.

An empty Symbol field means that the default naming convention (as specified in the codegen.ini file) is used.

See also

[Implementation Editor for Methods/Processes/Runnables](ImplementationEditorEnglishUS.chm::/ied_implementation_editor_methodsprocesses.htm)

[Runnable Entities and Events](ASCRunnableEntity.md)

[Implementation Editor for Methods, Processes and Runnables](ImplementationEditorEnglishUS.chm::/ied_implementation_editor_methodsprocesses.htm)
