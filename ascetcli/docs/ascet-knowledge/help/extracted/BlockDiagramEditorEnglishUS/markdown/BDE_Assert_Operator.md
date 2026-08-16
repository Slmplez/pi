# Assert Operator

![](images/buttonAssert.gif)

The Assert operator allows to specify lower and upper bound of an interval. This interval is then used by the code generator as the result interval of the Assert operator; the calculated interval of the operand is overwritten. It is possible to use the Assert operator with only one boundary; in that case, the other boundary is specified as -oo or +oo.

The result type of the assert operator is the same type as the operand, with the interval replaced by the interval specified on the assert operator.

The assert operator conveys user-defined interval information to the code generator. The Assert option in the operator's context menu opens the [Assert Attributes dialog window](BDE_AssertAttributes_Window.md), where you can enter min and max values for the operand interval. The code generator can use this information to generate more efficient code. However, the correctness of the assertion must be reviewed manually; this is supported by the semantic analysis.

In addition, the assert operator is suitable to replace implementation casts with deactivated Limit Assignments option (see also [Setting the Limitation](ImplementationEditorEnglishUS.chm::/set_limitation.htm)).

The following semantic checks are performed:

- If the physical operand interval and the assert interval have no intersection, an error (MIle76) is issued during code generation, because this is most likely a modeling error.
- If the physical operand interval and the assert interval overlap, but neither interval is fully contained in the other, an information message (IIle76) is issued during code generation.

This is potentially a modeling error, so you might want to [promote](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm) the information to a warning.

- If the physical operand interval is contained in the assert interval, an information message (IIle77) is issued during code generation.

- If the model contains an implementation cast with deactivated Limit Assignments option, and if the formula of the implementation cast is the same as the formula of the operand, an information message (IIle78) is issued during implementation code generation.

This message informs you that the implementation cast can be replaced by an assert operator, and specifies the required assertion interval.

See also [Example: Assert Operator](BDE_Example_AssertOperator.md).

See also

[Assert Attributes Dialog Window](BDE_AssertAttributes_Window.md)

[Using the Assert Operator](BDE_Use_AssertOperator.md)

[Context Menu - Operators and Control Flow Elements: Assert Operator](BDE_ContextMenu_OperatorsControlflow.md#Assert)

[Example: Assert Operator](BDE_Example_AssertOperator.md)

[Setting the Limitation](ImplementationEditorEnglishUS.chm::/set_limitation.htm)

[Promoting Messages](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm)
