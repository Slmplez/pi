# Do ... While

The do...while loop has the general form:

do

{

loopStatement;

} while (expressionLog);

The loopStatement block is executed. After that, the loop condition expressionLog (must be of type logical) is evaluated. If it is true, the loopStatement block is executed again, otherwise, the loop exits.

This behavior is different from the [while](while.md) loop where the loop condition is evaluated before the loop statement is executed.

In order to avoid infinite loops, the maximal number of loop iterations can be limited to a fixed number in the project properties, Experiment Code node, of the associated project (or default project).

See also

[Example: Do...While](ESDL_ExampleDoWhile.md)

[While](while.md)

[Project Editor - Experimental Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)
