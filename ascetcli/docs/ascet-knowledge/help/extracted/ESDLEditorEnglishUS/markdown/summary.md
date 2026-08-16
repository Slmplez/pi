# Operators - Summary

In ESDL, method calls take precedence over all other operators. The order of precedence can be manipulated by adding parentheses to an expression.

The following operator types are available:

- [Unary Operators](Unary_Operators.md)
- [Arithmetic Operators](Arithmetic_Operators.md)
- [Comparison Operators](Comparison_Operators.md)
- [Verify Operation](ESDL_VerifyOperator.md)
- [Logical Operators](Logical_Operators.md)
- [Conditional Operators](conditional_operator_mux.md)
- [Shorthand Assignment Operators](Shorthand_Assignment_Operators.md)
- [Conversion Operations](ESDL_ConversionOperations.md)
- [A](ESDL_AssertOperation.md)ssert Operation

The table summarizes the precedence and associativity of operators in ESDL.

| Column 1 | Column 2 |
| --- | --- |
| Operator | Associativity |
| ++ -- | right to left |
| + - (unary) | right to left |
| ! | right to left |
| * / % | left to right |
| + - (binary) | left to right |
| < <= | left to right |
| > >= | left to right |
| == | left to right |
| != | left to right |
| && | left to right |
| \|\| | left to right |
| ?: | right to left |
| = | right to left |
| *= /= %= += -= | right to left |

See also

[Unary Operators](Unary_Operators.md)

[Arithmetic Operators](Arithmetic_Operators.md)

[Comparison Operators](Comparison_Operators.md)

[Logical Operators](Logical_Operators.md)

[Conditional Operator (MUX)](conditional_operator_mux.md)

[Shorthand Assignment Operators](Shorthand_Assignment_Operators.md)
