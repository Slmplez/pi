# Optimizing a Database

This procedure is not available for workspaces.

To optimize a database, proceed as follows:

1. In the Component Manager, open the Tools menu, point to Database and select Performance Utilities.
1. Activate one or more of the options. Optimize Used to defragment the database. Convert Used to rewrite the database, thus improving access speeds. In most cases, regular optimization will be enough to keep the performance of your database at an acceptable level. You should only consider converting the entire database if you encounter serious problems with performance. Converting a large database can be very time-consuming. It is recommended to run this as an overnight process. Repair Used to rebuild the database from scratch. Damages of your database, e.g., destroyed references, are repaired. Repairing a database always includes the Optimize and Convert operations, the corresponding options are blocked. Check Used to verify the structures and references in the database while logging the results in the monitor window.
1. Click on the Execute button.
1. Click OK to close the message window.

See also

[ASCET Monitor Window](MonitorWindow.md)

[Database Info Dialog Window](DatabaseDialog.md)
