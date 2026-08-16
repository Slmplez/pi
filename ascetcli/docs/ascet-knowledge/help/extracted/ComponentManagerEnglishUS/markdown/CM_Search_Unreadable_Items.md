# Searching Unreadable Database Items

This procedure is not available for workspaces.

During, e.g., a power failure, database items can be so damaged that they can no longer be read by ASCET. If Clean All or one of the database performance utilities (see [Optimizing a Database](Optimize.md)) is executed while these damaged items are still present, the entire database can be destroyed. Proceed as follows to search for unreadable database items:

- In the Component Manager, open the Tools menu, point to Database and select Show Unreadable Items.

The database is searched. A status window shows the progress of the procedure and lists the number of bad entries detected so far.

1. If unreadable items are found, they are listed in the Items with read problems in part proxies window. When you click on an item in the said window, it is highlighted in the Component Manager, and you can delete it.
1. If no unreadable item is detected in the database, a message window opens with a respective note. Confirm with OK.

See also

[Optimizing a Database](Optimize.md)
