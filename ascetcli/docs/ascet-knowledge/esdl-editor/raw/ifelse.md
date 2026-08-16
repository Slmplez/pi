# If…Else

The if…else statement can be used for simple conditional constructions. It has the general form

if (expressionLog){

statementTrue;}

else {

statementFalse;}

The else block can be omitted. When expressionLog is evaluated, the program decides whether to execute the statementTrue block. If not, the program either executes an existing statementFalse block or it continues without doing anything.

The expressionLog that controls the decision must be explicitly of type log. An arithmetic with a value of one or zero is not accepted.

When the decision that the expression is always true can be made directly at the if statement, the construction is optimized in the generated C code. An example:

if (true || testlog_a) {

cont=1; }

else {

cont=0; }

is reduced to:

cont=1;

When an optimization is performed, an information is given in the ASCET monitor window. In the generated C code, however, no hint is given.

The decision whether optimization is performed is made locally at the if statement. If previous program parts would have to be considered to make the decision, no optimization takes place.
