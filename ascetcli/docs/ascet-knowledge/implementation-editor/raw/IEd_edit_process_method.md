# Editing a Process/Method Implementation

To edit a process/method implementation, proceed as follows:

1. Open the specification editor for the module or class you want to edit.
1. In the Outline tab, select the process or method you want to edit.
1. Do one of the following:
1. From the [Inline](ied_implementation_editor_methodsprocesses.md#Inline) combo box, select a value for inlining.
1. Activate the Use FPU option if you want to save the Floating Point Unit registers of your microcontroller target upon task switching.
1. From the Memory Location combo box, select the memory area where the code should run.
1. If you are working with ASCET-RP and ES1135, or with an ASCET-SE target, use the Memory Segment combo box for the respective settings.
1. In the Symbol field, enter the character string you want to use as C function name for the process or method in the currently selected implementation of the component.

Valid strings are any valid C identifier, any sequence of ASCET naming macros (see the list in [Implementation Editor for Methods/Processes/Runnables](ied_implementation_editor_methodsprocesses.md)), or any combination thereof.

An empty Symbol field means that the default naming convention (as specified in the codegen.ini file) is used.

See also

[Implementation Editor for Methods/Processes/Runnables](ied_implementation_editor_methodsprocesses.md)

[Software Component Editor - Editing the Implementation of a Runnable](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeditImplementationRunnable.htm)
