# Assert Operation

The Assert operation allows to specify a restricted interval in ESDL:

X.assert(lower, upper)

X is an expression of arithmetic type (i.e., cont, limitInt, wrapInt, sdisc or udisc). The lower and upper bounds of the interval must be integer expressions that are constant at generation time and can be represented in a common integer type. Otherwise, an error (MMdl361) is issued during code generation. It is possible to use the assert operation with only one boundary; in that case, the other boundary is specified as -INF or +INF.

The result type of the assert operator is the same type as the operand, with the interval replaced by the interval specified on the assert operator.

The assert operation conveys user-defined interval information to the code generator. The code generator can use this information to generate more efficient code. However, the correctness of the assertion must be reviewed manually; this is supported by the semantic analysis.

In addition, the assert operator is suitable to replace implementation casts with deactivated Limit Assignments option (see also [Setting the Limitation](../../implementation-editor/raw/set_limitation.md)).

The following semantic checks are performed:

- If the physical operand interval and the assert interval have no intersection, an error (MIle76) is issued during code generation, because this is most likely a modeling error.
- If the physical operand interval and the assert interval overlap, but neither interval is fully contained in the other, an information message (IIle76) is issued during code generation.

This is potentially a modeling error, so you might want to [promote](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm) the information to a warning.

- If the physical operand interval is contained in the assert interval, an information message (IIle77) is issued during code generation.

- If the model contains an implementation cast with deactivated Limit Assignments option, and if the formula of the implementation cast is the same as the formula of the operand, an information message (IIle78) is issued during implementation code generation.

This message informs you that the implementation cast can be replaced by an assert operator, and specifies the required assertion interval.

See also [Example: Assert Operation](ESDL_Example_AssertOperation.md).

See also

[Example: Assert Operation](ESDL_Example_AssertOperation.md)

[Setting the Limitation](../../implementation-editor/raw/set_limitation.md)

[Promoting Messages](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm)
