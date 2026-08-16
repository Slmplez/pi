# For

The for loop stands out as one of the modelling features that are available in ESDL only. There is no equivalent in block diagrams.

The for loop has the general form

for ( initExpression; expressionLog; incrExpression )

{

loopStatement; }

This is equivalent to

initExpression;

while (expressionLog) {

loopStatement;

incrExpression; }

In the for loop, every component of the loop head, initExpression, expressionLog, and incrExpression, is optional. The loop condition expressionLog must be of type logical. It is set to true if omitted, which results in an infinite loop.

In ESDL, the components of the loop head must be simple expressions. Comma-separated lists of expressions, such as i=0, j=1, or i++, j--, are not accepted. In other words, it is not possible to use more than a single statement in either the initExpression or the incrExpression.

In order to avoid infinite loops, the maximal number of loop iterations can be limited to a fixed number in the project properties, Experiment Code node, of the associated project (or default project).

See also

[Example: For](ESDL_Example__For.md)

[Project Editor - Experimental Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)
