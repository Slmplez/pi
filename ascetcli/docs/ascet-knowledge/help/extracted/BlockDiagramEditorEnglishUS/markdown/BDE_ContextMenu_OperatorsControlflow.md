# Context Menu - Operators and Control-Flow Elements

The context menu of an operator or control-flow element depends on the type of the operator or element:

- some options are available for [all operators and control-flow elements](#all)
- some options are available for [arithmetic, logical, comparison, input and conditional operators](#Arithmetic)
- some options are available only for the [conversion operator](#Conversion)
- some options are available only for the [assert operator](#Assert)
- some options are available for [control-flow elements](#Control-flow)

## All Operators and Control-Flow Elements:

- Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) dialog window. All available views are listed, and the visibility of the operator/control flow element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

- Create ASCET Link

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the selected operator/control flow element in the drawing area.

- Fill Color

Sets the fill color of the operator or control flow element.

- Browse Connected Elements

[Browses the elements](ViewItem.md) connected to the diagram item. Not available if the operator/control flow element is unconnected.

## Arithmetic, Logical, Comparison, Input and Conditional Operators:

- Temporary Variable

Temporary variables are deprecated; they will be removed in a future ASCET version.

Adds a [temporary variable](IntroductionEnglishUS.chm::/INT_temporary_variables.htm) to the operator output.

- Add Input

Adds another input pin (and control pin, if necessary) to the operator or control flow element.

- Remove Input

Removes an input pin (and control pin, if necessary) from the operator or control flow element.

- Implementation

Allows to view (View submenu option) or remove (Reset submenu option) an [operator implementation](ImplementationEditorEnglishUS.chm::/operator_impl.htm) from a block diagram created with an older ASCET version.

- Add Implementation Casts

[Adds implementation casts](Addimplementation.md) to the connected inputs and outputs of the operator.

## Conversion Operator:

- Conversion

Opens the [Conversion Attributes dialog window](BDE_ConversionAttributesWindow.md).

- Conversion Type

Opens a submenu that determines whether the conversion operator converts the input element to [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) (Limited) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) (WrapAround) type.

- Use Limits

For limitInt elemets: Determines if the limits for the converted type are user-defined (selected) or defined by the type limits (not selected).

For wrapInt elemets: Determines if the code generator uses the entire type interval (not selected) or a smaller, user-defined interval (selected).

Selecting this menu option enables the Min and Max fields in the Conversion Attributes dialog window.

## Assert Operator:

- Assert

Opens the [Assert Attributes dialog window](BDE_AssertAttributes_Window.md).

## Control-Flow Elements:

- Show Sequence Calls

Shows/hides the sequence calls of a control flow element.

- Kind

The options in the submenu, If Then and If Then Else, determine the type of the If block.

- Add Condition

Adds a branch to the [Switch](BDE_switch.md) block; see also [Using the Switch](UseSwitch.md).

- Remove Condition

Removes the most recently added branch from the Switch block; see also [Using the Switch](UseSwitch.md).

- Edit Literals

Opens an editor window for the branches of the Switch block; see also [Using the Switch](UseSwitch.md).

See also

[Operators](BDE_OperatorsSummary.md)

[Control Flow Elements](BDE_ControlFlow_Summary.md)

[Automatic Documentation - Views Window (Graphical Editors)](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm)

[Automatic Documentation - Editing the Views of a Diagram Item](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm)

[Sequence Calls](BDE_SequenceCalls.md)

[Viewing All Elements Connected to an Item](ViewItem.md)

[Introduction - Temporary Variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm)

[Implementation Editor - Operator Implementation](ImplementationEditorEnglishUS.chm::/operator_impl.htm)

[Adding Implementation Casts to Operators Automatically](Addimplementation.md)

[Using the Switch](UseSwitch.md)

[Conversion Attributes Dialog Window](BDE_ConversionAttributesWindow.md)

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)
