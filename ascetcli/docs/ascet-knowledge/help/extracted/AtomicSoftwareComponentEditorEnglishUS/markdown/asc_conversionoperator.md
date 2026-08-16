# Conversion Operator

![](buttonConversionLimit.gif) ![](buttonConversionWrap.gif)

The Conversion operator allows to convert scalar elements to [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) types. The function of the convert operator is determined either via the button used to create the operator or via the Conversion Type submenu in the operator's context menu.

The Use Limiters option in the operator's context menu is used to determine if the limits for the converted type are user-defined or not.

The Conversion option in the operator's context menu opens the [Conversion Attributes](asc_conversionattributeswindow.md) dialog window, where you can enter min and max values and - for wrapInt - type for the converted type.

[Examples: Conversion Operator](BlockDiagramEditorEnglishUS.chm::/BDE_Example_ConversionOperator.htm) contains examples for using the conversion operator.

- The first example shows a cont variable converted to limitInt; min and max of the conversion are set manually.
- The second example shows a cont variable converted to limitInt; min and max of the conversion are set automatically.
- The third example shows a cont variable converted to wrapInt; min and max of the conversion are set manually.
- The fourth example shows a cont variable converted to wrapInt; min and max of the conversion are set automatically.

See also

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Context Menu - Operators: Conversion Operator](ASCcontextMenuOperators.md#Conversion)

[Examples: Conversion Operator](BlockDiagramEditorEnglishUS.chm::/BDE_Example_ConversionOperator.htm)
