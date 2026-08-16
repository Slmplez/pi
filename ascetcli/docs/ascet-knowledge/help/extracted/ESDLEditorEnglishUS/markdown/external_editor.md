# External Editor

The editor available for creating ESDL code is limited and can only carry out simple operations. Another way of creating code is to select a user-defined external editor (e.g. Notepad, Codewright, etc.). As the external editor is connected via a file system, files with the suffixes *.c and *.h must be associated with the editor in the Windows configuration. Without this association, the external editor cannot be opened from the ASCET environment. However, an error message indicates that the association is missing.

After using the button for the external editor, the view of the ESDL code editor is changed. It is divided into an upper section listing all the available methods or processes of a component and a lower section showing the ESDL code.

When the external editor is opened, the code for a method or a process is written to one or more files which are stored in a temporary directory. After you have finished working, the files first have to be saved in the external editor, before they can be returned to the ASCET environment. Closing the external editor from the ASCET environment writes the stored code changes from the external editor to the ASCET environment, at the same time reading and deleting the temporary file. Code changes made afterwards in the external editor environment can no longer be returned to the ASCET environment. If you need to re-edit the code, you must call the external editor from the ASCET environment again.

In order to return code changes made in the external editor to the ASCET environment, you must save the code in the external editor first.

See also

[Using an External Editor](open-external-editor.md)

[Ending the External Editor Mode](end-external-editor.md)
