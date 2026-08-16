# Interface Editor for Arithmetic Services

The arithmetic services interface editor (henceforth AS editor) is included with ASCET as a tool which can be used for creating and editing files that contain interface definitions for arithmetic services. These files are named services.ini, and they have to be located in each ASCET target directory.

The files for arithmetic services (AS files) contain the interface definitions that are necessary for generating code with ASCET. The structure of AS files conforms to the Windows standard for *.ini files. These files contain only definitions of sets, interface definitions and comments.

A set definition is a character string enclosed in square brackets ([ ]), an interface definition takes the form of any character string that conforms to predetermined syntax, and a comment is any character string that starts with a semicolon.

An AS file should contain at least one set and no more than 255 sets of arithmetic services. A set begins with the declaration of its name and contains all of the interface definitions below it up to the next set definition or the end of the file.

An AS file might look like this:

[Set name]

Function

Function

...

[Set name]

;Comment

Function

Function

...

See [Creating and Saving Arithmetic Services](AS_Creating_and_Saving_Arith_Ser.md) for a detailed description of the syntax of the AS file layout.

See also

[Functions of the AS Editor](functions_as_editor.md)

[Launching the AS Editor](AS_Launching_the_AS_Editor.md)

[User Interface of the AS Editor](user_interface_as-editor.md)

[Loading a File](loading_file.md)

[Creating and Saving Arithmetic Services](AS_Creating_and_Saving_Arith_Ser.md)
