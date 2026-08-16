# SEND

The SEND keyword is used to send a (Windows) message to another running application. ASCET waits until the application has processed the message. The following possibilities to send a message are available:

SEND <class> <message>

SEND <class> <window> <message>

SEND <class> <window> <message> <1param>

SEND <class> <window> <message> <1param> <wparam>

<class>

Is the class name of the application.

<window>

Is the window title of the application.

<message>

Is the name or identifier of the message to be sent.

<1param>

Is the first optional parameter (0 ... 4294967295).

<wparam>

Is the second optional parameter (0 ... 4294967295).

For more details, refer to the Microsoft Windows Win32 interface documentation, checking the SendMessage keyword in particular.

See also

[Structure of the Script Files](structure_script_file.md)

[POST](post.md)
