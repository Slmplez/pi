# State Variables

Code generation for a state machine generates several state variables:

- sm state variable - contains the currently active state

This variable is the only state variable visible in the state machine editor: ![](icon_smvariable.gif)

- additional state variables if hierarchical code generation is activated
- a history state variable for a hierarchy state with history

The implementation of these variables is determined automatically, with the exception of memory location and cache locking/memory segment settings. These settings can be made in the implementation editor of the sm variable, see [Specifying the Memory Location of State Variables](ImplementationEditorEnglishUS.chm::/IEd_SpecifyMemLoc_StateVariables.htm).

A special method can be defined that reinitializes the state variables. The following rules apply to the reinitialization method:

- One reinitialization method can be specified per state machine.
- The reinitialization method must not have a return value. If it has, an error is issued during code generation.

Arguments are not forbidden.

- During code generation, any method body is replaced by code that initializes the state variables.

If no method body is specified for the reinitialization method, an information message is generated. If a method body is specified, a warning is generated that the specified body will be discarded.

- The reinitialization method must not be called during a transition because changing the state variables during the execution of a transition may result in unexpected behavior of the state machine.

This means that a private reinitialization method can only be called from the static action of a state.

The reinitialization method is the only way to reset the history variable.

See also

[Implementation Editor - Specifying the Memory Location of State Variables](ImplementationEditorEnglishUS.chm::/IEd_SpecifyMemLoc_StateVariables.htm)

[Specifying a Reinitialization Method for State Variables](sm_specifyresetmethod_statevariables.md)

[Hierarchical Code Generation](SM_Hierarchical_Code_Generation.md)

[Hierarchy](SM_hierarchy.md)

[History](SM_History.md)
