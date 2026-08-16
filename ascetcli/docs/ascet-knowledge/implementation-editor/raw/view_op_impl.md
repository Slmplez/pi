# Viewing an Operator Implementation

To view an operator implementation, proceed as follows:

1. Open the respective block diagram.
1. Right-click on an operator with an implementation, open the Implementation context menu and select View.

A warning is displayed, indicating that operator implementations are no longer supported.

1. Click OK to open the Implementation for window.

The window serves as a display only, you cannot change any setting.

1. Click on OK.

The implementation for a mathematical operator determines the procedure if there is an overflow and/or the quantization (e.g. the accuracy) in the result. As with variables, this information can vary across different implementations for the relevant module. The information available for each operator is described below.

The integer code generator treats the basic operations completely differently. Additional information, therefore, also depends on the specific operation.

- [Addition and Subtraction](IEd_Implementation_for_AddSubWindow.md)
- [Multiplication](IEd_multiplication.md)
- [Division](IEd_division.md)
- [Multiplexor, Maximum, Minimum](Ied_multiplexer_max_min.md)
