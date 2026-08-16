# Environment Options

The Environment node contains the following options:

##### Automatic Save

Activates/deactivates the automatic saving function.

##### Store every ... minutes

Time interval for automatic saving

##### Workspace area

- Workspace Cache Memory Limit (Mbyte)
- Workspace Cache Release Limit (Objects)
- Workspace Memory Limit (MByte)

Defines how much memory the workspace can allocate.

The maximum value depends on the operating system. On a 32 bit OS, the workspace can allocate up to 2048 MByte, on a 64 bit OS, the workspace can allocate up to 4096 MByte.

##### Database area

- Pre Check Database

If activated, the database is checked for corrupted items before Clean All or one of the database performance utilities (see [Optimizing a Database](Optimize.md)) are executed.

##### GDI Handle Limit

Windows uses handles each time a new window opens. Windows itself does not control the amount of used handles; to prevent system crashes, ASCET needs to limit the amount of used handles itself.

The GDI Handle Limit option allows to set the maximum amount of open GDI handles for ASCET. The value can be between 8000 and 9000; it can differ from machine to machine, depending on the graphical environment. If all handles are used, no further ASCET windows open.
