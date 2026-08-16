# Cache Locking in the OS Editor

In the [OS editor](ProjectEditorEnglishUS.chm::/PE_OS_Tab.htm), you can select a task and set cache locking for the modules whose processes are included in the task.

You cannot, in this way, set cache locking for individual processes. If the processes of a module are assigned to different tasks, you can still make only one setting for all of them in the OS editor. Setting cache locking for individual processes is explained in [Cache Locking for Elements and Methods/Processes](IIO_CacheLocking_ElementMethodProcess.md).

1. Open the OS editor.
1. In the Tasks pane, select a task.
1. Do one of the following:
1. Select the components to which you want to assign <setting>.
1. Click OK.
1. Open the Task menu and select Cache Locking Report.

An XML file is generated that lists name, model and database path, cache locking setting, and selected implementation for the parent components of all processes assigned to the selected task, and of that components' included components.

See also

[Project Editor - OS Tab](ProjectEditorEnglishUS.chm::/PE_OS_Tab.htm)

[Cache Locking for Elements and Methods/Processes](IIO_CacheLocking_ElementMethodProcess.md)

[ES1135: Cache Locking](IIO_ES1135CacheLocking.md)
