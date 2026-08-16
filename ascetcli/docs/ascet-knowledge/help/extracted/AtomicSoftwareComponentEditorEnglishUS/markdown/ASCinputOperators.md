# Input Operators

The following Input Operators are available:

| Column 1 | Column 2 |
| --- | --- |
|  | The Absolute operator returns the absolute value of the argument. Argument and return value have to be both either cont or discrete (see also Scalar Types - Summary ). |
|  | The Max operator returns the maximum input (argument). The operator can have 2 to 20 arguments and can be applied only to arithmetic elements. |
|  | The Min operator returns the minimum input (argument). The operator can have 2 to 20 arguments and can be applied only to arithmetic elements. |
|  | The Between operator checks if the argument value lies between the limiters min and max. If this is the case, the logical return value out_log is true, otherwise it is set to false. The graphical representation is equivalent to out_log = (( value >= min ) && ( value <= max )) . The argument and both limiters have to be either cont or discrete (see also Scalar Types - Summary ). |

See also

[Arithmetic Operators](ASCarithmeticOperators.md)

[Logical Operators](ASClogicalOperators.md)

[Comparison Operators](ASCcomparisonOperators.md)

[Negation Operator](ascnegationoperator.md)

[Conditional Operators](ASCconditionaloperators.md)

[Control Flow Operators](ASCcontrolFlowOperators.md)

[Miscellaneous Basic Blocks](ascmiscbasicblocks.md)
