# Implementations of Method-/Process-/Runnable-Local Variables

Method-, process- and runnable-local variables can be implemented automatically or explicitly. With automatic implementation, the implementation is derived from the first variable assigned to the method-/process-local variable.

Default for scalar and enumeration local variables and references (i.e. arrays, matrices or records with activated Reference option, or classes) used as local variables is automatic implementation. Local variables of array, matrix or record type, marked as instances (see the Adding Local Variables * links below), cannot be implemented automatically.

If references are used as method-/process-/runnable-local variables, a memory class can be selected in the Memory Location of Instance combo box. This memory class does not apply to the reference in this case, it applies to the target of the reference.

See also

[Implementing a Method-/Process-/Runnable-Local Variable](impl_localvariables.md)

[Activating Automatic Implementation](activate_automatic_impl.md)

[Adding Local Variables to the Method or Process](BlockDiagramEditorEnglishUS.chm::/BDE_Localvariables.htm) (block diagram editor)

[Adding Local Variables to a Runnable or Method](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCaddLocalvariables.htm) (SWC editor)
