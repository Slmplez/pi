# While

The while loop is used to model a simple loop. It has the general form:

while (expressionLog) {

loopStatement; }

The loop condition expressionLog is evaluated. If it is true, the loopStatement block is executed and expressionLog is evaluated again. The loop exits when expressionLog evaluates to false.

In ESDL, the loop condition expressionLog must be of type logical.

In order to avoid infinite loops, the maximal number of loop iterations can be limited to a fixed number in the project properties, Experiment Code node, of the associated project (or default project).

See also

[Project Editor - Experimental Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)
