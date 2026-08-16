# Defining a Shutdown Action

A shutdown action is defined in the [SHUTDOWN] section of the *.ini file. The section can be anywhere in the *.ini file, it contains only one line, FILE =<filename>.

Example:

[SHUTDOWN]

FILE=shutdown.txt

When ASCET is shut down, the shutdown.txt script file is executed.

You cannot access COM-API with the shutdown function as the automation server has already been shut down at this time.
