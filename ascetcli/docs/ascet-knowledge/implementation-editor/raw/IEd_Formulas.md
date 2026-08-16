# Formulas

ASCET supports transformation formulas to define the implementation for fixed-point arithmetic. The identity formula is present in each project, other formulas have to be defined in the project editor of the associated project.

The following rules apply:

1. If the variable has the model data type cont and the implementation data type real32 or real64, only the identity formula should be selected because only this formula is supported by the code generation. If you select another formula, a warning message is displayed in the implementation editor:
1. If the variable has the model data type cont and an integer implementation data type, the identity or a linear formula should be selected because only these formulas can be handled by ASCET. If you select a non-linear formula, a warning message is displayed in the implementation editor:
1. If you edit an element with model data type [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm), [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm), sdisc or udisc, and select another formula than the identity, an error message is displayed in the implementation editor:

Disc model type must have identity formula.

You must correct the formula (e.g., with the Auto Correction button in the implementation editor) or cancel the implementation.

Models from earlier ASCET versions can be used unchanged. During code generation, however, warnings are generated if they contain formulas for discrete elements.

If you make changes in a formula, or recursively replace a formula in a project implementation, you can have all your implementations updated automatically to match the new value ranges and data types. For information on replacing formulas and updating implementations see [Global Changes in Implementations](ProjectEditorEnglishUS.chm::/Globalchanges.htm).

See also

[Examples: Rules for Formulas](IEd_Examples_RulesFormulas.md)

[Selecting a Formula](IEd_select_formula.md)

[Introduction - Scalar Types: Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Introduction - Scalar Types: Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Project Editor - Adding a Formula](ProjectEditorEnglishUS.chm::/PE_add_formula.htm)

[Project Editor - Global Changes in Implementations](ProjectEditorEnglishUS.chm::/Globalchanges.htm)

[Introduction - Rescalable Implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm)
