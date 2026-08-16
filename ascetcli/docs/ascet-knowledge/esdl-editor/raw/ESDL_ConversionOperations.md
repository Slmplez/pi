= Sint8, Sint16, Sint32, Uint8, Uint16, or Uint32

= Sint8, Sint16, Sint32, Uint8, Uint16, or Uint32

# Conversion Operations

Several operations allow to convert scalar elements of numerical or enumeration type to [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) types:

- <element>.wrapAround<ImplType>()

The element <element> is converted to a wrap-around integer type with an implementation type [<ImplType>](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //--> and an interval selected by the code generator.

- <element>.wrapAround<ImplType>(<min>,<max>)

The element <element> is converted to a wrap-around integer type with an interval specified by the user. The lower and upper bounds of the interval, <min> and <max>, must be generation-time constant integer expressions that are representable in the specified [<ImplType>](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

- <element>.limit()

The element <element> is converted to a limited integer type with an interval selected by the code generator.

- <element>.limit(<min>,<max>)

The element <element> is converted to a limited integer type with an interval specified by the user. The lower and upper bounds of the interval, <min> and <max>, must be generation-time constant integer expressions that are representable in a common integer type.

See [Examples: Conversion Operations](ESDL_Example_ConversionOperations.md) for examples for all four operations.

See also

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Examples: Conversion Operations](ESDL_Example_ConversionOperations.md)
