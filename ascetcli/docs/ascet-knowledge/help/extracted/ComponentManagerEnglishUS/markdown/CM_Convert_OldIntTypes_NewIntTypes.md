e.g., C:\ETAS\LogFiles\ASCET

e.g., C:\ETAS\LogFiles\ASCET

# Converting Old Integer Types to New Integer Types

You can automatically convert scalar, array and matrix elements that use the deprecated sdisc or udisc types to limitInt or wrapInt, either in the [entire database/workspace](#InDatabase), or in [individual components](#InComponent).

If desired, you can [test the new behavior for integer types](IntroductionEnglishUS.chm::/INT_Test_NewBehavior_IntegerTypes.htm) before you convert them permanently.

You can export components that use the limited integer and wrap-around integer types only in AMD format V6.4 and higher. An AMD format V6.3 or older will result in an export error.

##### In the entire database/workspace

- In the Component Manager, open the Tools menu, point to Database or Workspace, then point to Convert and select Convert all old integer types to new integer types where possible.

The sdisc/udisc elements in all projects and their child components are converted to limitInt or wrapInt, according to the [conversion rules](IntroductionEnglishUS.chm::/INT_Convert_SdiscUdisc_to_limitInt_wrapInt.htm).

Elements that could not be converted are listed in the ASCET monitor window and in the Ascet_Monitor.log file in the [ASCET log directory](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

##### In individual components

1. In the 1 Database or 1 Workspace list, select the component whose sdisc/udisc elements you want to convert.
1. Right-click the component, point to New Integer Types in the context menu and select Convert Selection or Convert Recursive.
1. When you selected * recursive, do the following.

1. Activate Don't show this message again if you want to execute similar commands without inquiry.
1. Click OK to perform the operation.

The sdisc/udisc elements in the selected component or in the context of the selected project are converted to limitInt or wrapInt, according to the [conversion rules](IntroductionEnglishUS.chm::/INT_Convert_SdiscUdisc_to_limitInt_wrapInt.htm).

Elements that could not be converted are listed in the ASCET monitor window and in the Ascet_Monitor.log file in the [ASCET log directory](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.

If the results of the automatic conversion do not meet your needs, or if some elements could not be converted, you can convert individual elements, see [Using the Conversion Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseConversionOperator.htm) (block diagrams) and [Conversion Operations](ESDLEditorEnglishUS.chm::/ESDL_ConversionOperations.htm) (ESDL).

See also

[Converting sdisc/udisc to limitInt/wrapInt](IntroductionEnglishUS.chm::/INT_Convert_SdiscUdisc_to_limitInt_wrapInt.htm)

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Confirmation Dialog Options](CM_Options_for_Confirmation_Dialogs.md)

[Using the Conversion Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseConversionOperator.htm)

[Conversion Operations](ESDLEditorEnglishUS.chm::/ESDL_ConversionOperations.htm)

[Testing the New Behavior for Integer Types](IntroductionEnglishUS.chm::/INT_Test_NewBehavior_IntegerTypes.htm)
