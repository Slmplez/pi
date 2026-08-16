# Does not Compute Correctly When Using Temporary Variables

[Temporary variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm) are deprecated; they will be removed in a future ASCET version. ASCET does not compute correctly when using temporary variables

In block diagrams, temporary variables can be used if the result of an expression is to be used in several different branches. These temporary variables are only computed once (upon evaluation of the first branch). If the branches using the temporary variable are only computed conditionally (e.g. as they are input to a switch or a MUX operator), the value of that temporary variable may not be computed correctly. Therefore automatic temporary variables should not be used, if the branches leading from a temporary variable are fed into a conditional operator.

Consider using [common subexpression elimination](ProjectEditorEnglishUS.chm::/CodeOptimization.htm#CommonSubexpr) instead.

See also

[Temporary Variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm)

[Project Properties Window - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)
