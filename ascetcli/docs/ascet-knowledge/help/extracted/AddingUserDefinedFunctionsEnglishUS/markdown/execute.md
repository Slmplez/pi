# EXECUTE

The keyword EXECUTE is used to start an external program or a batch file. As long as the external program is running, the execution of the script file is interrupted.

Examples:

- EXECUTE C:\ETAS\Ascet6.3\import.bat invokes the batch file import.bat in the directory C:\ETAS\Ascet6.3.
- EXECUTE C:\WINNT\system32\notepad.exe starts the Notepad text editor.

The interruption of the execution can have undesired results. If, for example, a menu item open PSP is added to My Menu to make it easier to create screenshots, the following happens:

- The menu item invokes the script file with the following content:

OBJECT popWindow: BDE

EXECUTE c:\Programme\Paint Shop Pro 5\psp.exe

- The first line results in the block diagram editor popping up. The second opens the image processing program.

But because the execution of the script file is interrupted, the block diagram editor is not updated.

Swapping the lines around does not solve the problem because this would result in the block diagram editor popping up after the image processing program has been closed.

See also

[Structure of the Script Files](structure_script_file.md)

[NOWAIT](nowait.md)
