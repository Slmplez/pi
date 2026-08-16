# Viewing Debug Information

Components that are specified in C code provide additional facilities to display either debug information or error messages during experimentation. You can embed debug or error messages in your C code. Debug information is displayed in the target debug viewer that can be opened during experimentation. Error messages are printed to the ASCET monitor window.

When editing C code, use the functions asdWriteUserDebug() and asdWriteUserError() to specify the information to be displayed. Both functions take an argument string which contains the message to be displayed. A typical statement could look like this:

asdWriteUserError(Overflow: \n Upper Limit exceeded.)

The string argument follows standard ANSI C rules, the example is printed in two lines. To view debug information, proceed as follows:

- In the Tools menu, select Target Debugger to open the C-Target Debug-Window.

See also

[Automatic Display](view_automatic_display.md)

[Manual Display](view_manual_display.md)

[Clearing the Debug Text](view_clear_text_window.md)

[Saving the Debug Text](view_save_text_window.md)
