# Using Temporary Variables

Temporary variables are deprecated; they will be removed in a future ASCET version.

To use temporary variables in a block diagram, proceed as follows:

1. Make sure that the Disable BDE Temp Variable Generation option in the [Optimization](ProjectEditorEnglishUS.chm::/CodeOptimization.htm) node of the parent project properties is deactivated.
1. Right-click on the operator or class or hierarchy/statement block output pin to which you want to add a temporary variable.
1. Select Temporary Variable from the context menu.

The operator displays a solid rectangle on the output pin to indicate that the result of the operation is stored in a temporary variable.

![](image5.gif)

1. Repeat the command to remove the temporary variable.

See also

[Temporary Variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm)

[Project Properties Window - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)
