# Verify Operation

The verify(); operation is used to check if the original and the complement of an element marked as redundant are consistent. The operation returns a Boolean value.

You can verify scalar, array, and matrix elements marked as redundant. The verify operation can be used wherever a Boolean is accepted, e.g.,

myBooleanResult = myRedundantElement.verify();

if (myRedundantElement.verify()) { ... }

...

See [Code Generation with Redundant Data Storage](IntroductionEnglishUS.chm::/INT_CodeGen_RedundantDataStorage.htm#VerifyScalar) for examples of verify(); in assignments.

You must apply the verify(); operation only to an element marked as redundant. If you apply the verify(); operation to a non-redundant element, an error is issued during code generation: MMdl371 - verify operator can only be used on model identifier with redundant flag set

See also

[Redundant Data Storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm)

[Code Generation with Redundant Data Storage](IntroductionEnglishUS.chm::/INT_CodeGen_RedundantDataStorage.htm)
