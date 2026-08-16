# Conversion Operator

![](images/buttonConversionLimit.gif) ![](images/buttonConversionWrap.gif)

The Conversion operator allows to convert scalar elements of numerical or enumeration type to [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) types. The function of the convert operator is determined either via the button used to create the operator or via the Conversion Type submenu in the operator's context menu.

The Use Limiters option in the operator's context menu is used to determine if the limits for the converted type are user-defined or not.

The Conversion option in the operator's context menu opens the [Conversion Attributes dialog window](BDE_ConversionAttributesWindow.md), where you can enter min and max values and - for wrapInt - type for the conversion result.

- The [first example](BDE_Example_ConversionOperator.md#Example1) shows a cont variable converted to limitInt; min and max of the conversion are set manually.
- The [second example](BDE_Example_ConversionOperator.md#Example2) shows a cont variable with integer implementation converted to limitInt; min and max of the conversion are set automatically.
- The [third example](BDE_Example_ConversionOperator.md#Example3) shows a cont variable converted to wrapInt; min and max of the conversion are set manually.
- The [fourth example](BDE_Example_ConversionOperator.md#Example4) shows a cont variable converted to wrapInt; min and max of the conversion are set automatically.

See also

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Conversion Attributes Dialog Window](BDE_ConversionAttributesWindow.md)

[Context Menu - Operators and Control Flow Elements: Conversion Operator](BDE_ContextMenu_OperatorsControlflow.md#Conversion)

[Examples: Conversion Operator](BDE_Example_ConversionOperator.md)

[Using the Conversion Operator](BDE_UseConversionOperator.md)
