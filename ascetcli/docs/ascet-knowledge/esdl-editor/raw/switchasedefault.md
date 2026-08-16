# Switch…Case…Default

The switch…case…default statement or, for short, the switch statement, can be used for more complex conditional constructions. It has the general form

switch (expressionInt) {

case constIntM: {

statementM }

…

case constIntN: {

statementN }

default: {

statementDefault }

}

The switch statement is a multi-way decision that tests whether the argument expressionInt matches one of the constant values constIntM through constIntN and branches accordingly.

Each case is labelled with a constant expression. The corresponding block is executed if the expressionInt matches the value of the constant expression. expressionInt and all constant expressions must be of the same integer type. The (optional) case default is executed if no other match can be found.

If the default case is not available and no match is found, the switch statement does nothing and control returns to the remainder of the software model.

Each case block should be terminated with a break statement. This causes the switch statement to be finished immediately after the block has been executed. If the case blocks were not terminated explicitly, execution would continue immediately after a match has been found. This phenomenon is commonly referred to as fall through. The remainder of a switch statement is always executed if a block is not terminated. Although this can be useful for multi-layered filtering it is generally regarded as poor style and should be avoided by terminating every case statement with a break.

See also

[Example: Switch...Case...Default](ESDL_Example__SwitchCaseDefault.md)
