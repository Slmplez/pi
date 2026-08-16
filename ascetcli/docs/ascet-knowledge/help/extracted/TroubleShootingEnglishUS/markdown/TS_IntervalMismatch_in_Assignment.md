# Interval Mismatch in Assignment

Interval mismatch in assignment of <variable_name>: [a,b] := [c,d] (will be limited)

##### Description:

The fixed point code generator has found, that in the assignment of variable variable_name there is a possible conflict. The value of the expression that is assigned to the variable lies within the interval [c,d]. This interval is computed via interval arithmetics from the intervals specified for the elements in that expression. The interval [a,b] for the variable variable_name does not, however, include the interval [c,d], so that an overflow might occur. To avoid this overflow, the value of the expression is automatically limited to the value interval of variable variable_name before the assignment is carried out. Note, that this warning cannot be avoided when there are arithmetic loops.
