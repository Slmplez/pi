# Implementation Editor for Methods, Processes and Runnables

The implementation editor for methods, processes and runnables contains the following elements:

- Inline combo box

Only available for methods and processes.

The following selections are available:

| Column 1 | Column 2 |
| --- | --- |
| Automatic | The code generator decides if, and how, a method/process will be inlined. Automatic should not be selected for a process. |
| None | no inlining |
| Preprocessor Evaluation | Marks a method/process that can be evaluated by the preprocessor. . |
| Compiler | The method code is inserted directly into the model code at compile time. Compiler should not be selected for a process. |

- Use FPU option

Only relevant for micro-controller targets.

Activates/deactivates the usage of the Floating Point Unit registers of the target.

- Memory Location combo box

Only relevant for micro-controller targets.

Used to select the memory area in which the method/process is located. Possible values depend on the target selected in the associated project or default project.

- Memory Segment combo box

In a project context with an ASCET-SE target, this combo box is used to select a memory segment. See the ASCET-SE user's guide, chapter "Memory Segments", for more information.

In a project context with the ES1135 experimental target, this combo box is used to set up [cache locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm).

- Symbol field

The text entered here is the C function name used for the process, method, or runnable entity in the currently selected implementation of the component.

Valid names are any valid C identifier, any sequence of ASCET naming macros (see table), or any combination thereof.

| Column 1 | Column 2 |
| --- | --- |
| naming macro | explanation |
| %COMPONENT.NAME% | model name of a component |
| %COMPONENT.IMPLEMENTATION% | model name of the selected implementation |
| %ELEMENT.NAME% | model name of an element |
| %class% | model name (in capital letters) of a component |
| %impl% | model name (in capital letters) of the selected implementation |
| %name% | model name (in capital letters) of an element |

![](BUTTON.GIF) OK

Closes the window and accepts the changes.

![](BUTTON.GIF) Cancel

Closes the window without accepting the changes.

See also

[Editing a Process/Method Implementation](IEd_edit_process_method.md)

[Software Component Editor - Editing the Implementation of a Runnable](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeditImplementationRunnable.htm)
