# Using the Verify Operator

The Verify operator is used to check if the original and the complement of an element marked as redundant are consistent. The operator returns a Boolean value.

Proceed as follows to check the consistency of an element marked as redundant:

1. In the Basic Blocks palette or toolbar, click on the ![](buttonVerifyOperation.gif) Verify button to add a Verify operator.
1. Place the operator in the drawing area.
1. For a scalar element marked as redundant, do the following:
1. For an array or matrix marked as redundant, do the following:
1. Connect the output of the Verify operator to a block that accepts Boolean values (e.g., a logic variable or the connector of an If block).

See [Code Generation with Redundant Data Storage](IntroductionEnglishUS.chm::/INT_CodeGen_RedundantDataStorage.htm#VerifyScalar) for examples of generated code.

You must connect only an element marked as redundant to the Verify operator. If you connect a non-redundant element to the Verify operator, an error is issued during code generation: MMdl371 - verify operator can only be used on model identifier with redundant flag set

See also

[Redundant Data Storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm)

[Code Generation with Redundant Data Storage](IntroductionEnglishUS.chm::/INT_CodeGen_RedundantDataStorage.htm)
