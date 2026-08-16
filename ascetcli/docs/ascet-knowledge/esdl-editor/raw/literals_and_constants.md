# Literals and Constants

Literals are values like 12, 6.1e4 or true. Every primitive type (boolean and arithmetic), can occur as a literal in an ESDL method. The data type of literals is implicit.

Constants are named values, such as g = 9.81. They are added to a class and declared in the same manner as variables. The Element Editor can be used to assign a value and flag a variable as a constant.

Some examples:

- x = g.abs();

The absolute value of the constant g is assigned to the variable x.

- out1 = myvar.max(g); or out1 = g.max(myvar);

The larger of the values myvar (a variable) and g is assigned to the variable out1.

- out2 = myvar.min(.04); or out2 = (.04).min(myvar);

The smaller of the values myvar and 0.04 is assigned to the variable out2.
