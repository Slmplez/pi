# Context Menu Operators

The context menu of an operator depends on the type of the operator:

- some options are available for [all operators](#all)
- some options are available for [arithmetic, logical, comparison, input and conditional operators](#Arithmetic)
- some operations are available for [AUTOSAR operators](#AUTOSAR)
- some options are available only for the [conversion operator](#Conversion)
- some options are available only for the [assert operator](#Assert)

## All Operators:

- Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) options dialog window. All available views are listed, and the visibility of the operator in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

- Create ASCET Link

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the selected operator in the drawing area.

- Fill Color

Sets the fill color of the operator.

- Browse Connected Elements

[Browses the elements](ascviewconnectedelements.md) connected to the operator. Not available if the operator is unconnected.

## Arithmetic, Logical, Comparison, Input and Conditional Operators:

- Temporary Variable

Temporary variables are deprecated; they will be removed in a future ASCET version.

Adds a [temporary variable](IntroductionEnglishUS.chm::/INT_temporary_variables.htm) to the operator output.

- Add Input

Adds another input pin.

- Remove Input

Removes an input pin.

- Implementation

Not available in software components.

- Add Implementation Casts

[Adds implementation casts](ascaddimplementationcast.md) to the connected inputs and outputs of the operator.

## AUTOSAR operators RTE Access, RTE Invoke and RTE Status:

- Show Sequence Calls

- Status

Only available for RTE Invoke.

Adds a status pin to the operator. That pin can be used to inquire the status of a client request on a port. See also [Making a Client Request on a Port](ASCmakeClientRequest_on_Port.md).

- Access

Only available for RTE Access.

Opens a submenu that determines whether the access operator allows Implicit, Explicit or Explicit with Status access. See also [Receiving from a Port](ASCreceiveFromPort.md) and [Sending to a Port](ASCsendToPort.md).

## Conversion Operator:

- Conversion

Opens the [Conversion Attributes](asc_conversionattributeswindow.md) dialog window.

- Conversion Type

Opens a submenu that determines whether the conversion operator converts the input element to [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) (Limited) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) (WrapAround) type.

- Use Limits

Determines if the limits for the converted type are user-defined or not. Selecting this menu option enables the Min and Max fields in the Conversion Attributes dialog window.

## Assert Operator:

- Assert

Opens the [Assert Attributes](BlockDiagramEditorEnglishUS.chm::/BDE_AssertAttributes_Window.htm) dialog window.
