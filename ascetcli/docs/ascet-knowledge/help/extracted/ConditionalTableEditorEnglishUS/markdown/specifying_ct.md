# Specifying Conditional Tables

All cells of the newly created columns and rows initially contain an asterisk (*). You have to enter the real conditions and instructions manually.

##### Conditions

The cells in the condition area can contain conditions in the following format:

== b, <= b, >= b, < b, > b, != b, *

- b

Is either a value, an element or the name of a public method of a referenced class. Complex expressions formed from these in ESDL syntax are possible.

- Asterisk

It means that any value is possible, it is used when the column element is of no significance to the current row.

- Several conditions can be specified in one cell, separated by a line break. These are interpreted as being AND-operated.

![](condtab_conditioncell%20copy.gif)

The cells in the condition area of the defaults row cannot be edited. They always contain an asterisk.

##### Instructions

The cells in the instruction area can contain assignments in the following format:

= b, class.method(variables), *

- b

Is a value, an element or the name of a public method of a referenced class. Complex expressions formed from these in ESDL syntax are possible.

- Class.method(variables)

Denotes a method call; this form of the instruction is only permissible in the methods column. All public methods of the referenced classes can be invoked.

- Asterisk

The asterisk means that no instruction (value assignment or method call) is defined in the relevant column.

You can only use elements and classes contained in the Outline tab to specify conditions and instructions. Otherwise an error message is created during code generation.

Syntax and semantics are not checked during the specification of conditions and instructions. Make sure your entries are correct, particularly when entering method names. Error messages are not created until code generation.

See also

[Entering a Condition or an Instruction](enter_condition_instruction.md)

[Altering Column Width](alter_column_width.md)

[Using Methods in Conditions/Instructions](use_methods_c_i.md)
