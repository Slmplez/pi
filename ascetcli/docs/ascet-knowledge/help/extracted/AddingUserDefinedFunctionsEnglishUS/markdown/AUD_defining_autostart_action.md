# Defining an Autostart Action

An autostart action is defined in the [AUTOSTART] section of the *.ini file. The section can be anywhere in the *.ini file, but can occur only once, even if several *.ini files are used. It contains only one line, FILE=<filename>.

Example:

[AUTOSTART]

FILE=start.txt

The start.txt script file is executed at the start of ASCET.

The autostart function is used to execute configurations for file operations (e.g. adapting templates for code generation, deleting directories) when ASCET is started. This results in a unique, reproducible situation. An editor or any other tool can also be invoked to execute the necessary preparatory work and settings for the session. A message (see [OBJECT](object.md)) can provide information on the settings made.

An example of this kind of script file:

EXECUTE c:\Programme\TextPad 4\TextPad.exe C:\ETAS\Ascet6.3\target\trg_c16x\codegen.ini

OBJECT message: codegen.ini is updated

You cannot access COM-API with the autostart function as the automation server is not started at this time.

See also

[OBJECT](object.md)
