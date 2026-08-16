# Break Operator

![](button_break.gif)

The break operator in the block diagram editor behaves similar to a C language return statement.

In a method, the break operator causes an immediate return from the method. The user is responsible for the correct setting of any return values before the break operator is executed.

In a process, the break operator causes a deferred exit. Deferred exit means that all send messages are sent before the exit occurs.

The break operator in the block diagram editor behaves differently from the break statement in ESDL.
