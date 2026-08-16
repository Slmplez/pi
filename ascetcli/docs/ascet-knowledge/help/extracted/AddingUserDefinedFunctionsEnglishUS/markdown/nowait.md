# NOWAIT

The keyword NOWAIT is used in exactly the same way as EXECUTE. The execution of the script file is not, however, interrupted here.

Example:

The example is the same as at the end of the previous section, but NOWAIT and not EXECUTE is now used in the script file.

OBJECT popWindow: BDE

NOWAIT C:\Program Files (x86)\Corel\Corel Paint Shop Pro Photo X2\Corel Paint Shop Pro Photo.exe

Again the first line results in the block diagram editor popping up. The second opens the image processing program. As the execution of the script file is not interrupted here, the block diagram editor is updated immediately and the screenshot can be taken.

See also

[Structure of the Script Files](structure_script_file.md)

[EXECUTE](execute.md)
