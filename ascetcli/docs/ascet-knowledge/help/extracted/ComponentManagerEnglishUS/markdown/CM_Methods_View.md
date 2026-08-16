# Methods View

When you select the Methods view, the 3 Contents field displays the Methods tab. This tab contains the following columns:

- Name

This column contains names and symbols of the methods, processes or runnables in the selected component.

- Inlining

Can only be edited for methods and processes.

Indicates whether the method code is inserted directly into the model code (Inlining, Compiler) or not (None), whether a method can be evaluated by the preprocessor (Preprocessor Evaluation), or whether the code generator decides, if and how the method/process is inlined (Automatic).

- Use FPU

Only relevant for micro-controller targets.

Indicates whether the Floating Point Unit registers of the target are used (true) or not (false).

- Memory Location

Only relevant for micro-controller targets.

Names the memory area in which the method/process is located. Possible values depend on the target selected in the associated project or default project.

- Memory Segment

In a project context with an ASCET-SE target, this column shows the selected memory segments. See the ASCET-SE user's guide, chapter "Memory Segments", for more information.

In a project context with the ES1135 experimental target, this column shows the current [cache locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm) settings.

See also

[Views in the Component Manager](ViewsinCM.md)

[Context-Sensitive Menu Options (Methods Tab)](CM_ContextSensitive_MenuOptions_MethodsTab.md)
