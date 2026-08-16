# Temporary Variables

Temporary variables in block diagrams are deprecated; they will be removed in a future ASCET version.

To avoid multiple execution within the same method or process, temporary variables can be specified for each operator or method call or hierarchy/statement block output in a block diagram. With that, the value of the expression is computed only once for each block it is used in, and stored to a temporary variable. When the expression is used again in that method, it is not re-evaluated but the temporary variable is reused.

A temporary variable does not have a start value; its value is determined only by the assignment of an expression. ASCET internally manages the temporary variables and provides a unique assignment (e.g. in the branches of an IF statement) so that no undefined values turn up when the temporary variable is used later. The value remains valid until a new assignment to the temporary variable occurs.

The example shows the temporary variable t which stores and reuses the value of the addition a + b:

t = a + b;

c = t;

d = t;

To use temporary variables in block diagrams, the Disable BDE Temp Variable Generation option in the [Optimization](ProjectEditorEnglishUS.chm::/CodeOptimization.htm) node of the parent project properties must be deactivated.

See also

[Using Temporary Variables](ElementEditorEnglishUS.chm::/EEd_use_temporary_variables.htm)

[Project Properties Window - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)
