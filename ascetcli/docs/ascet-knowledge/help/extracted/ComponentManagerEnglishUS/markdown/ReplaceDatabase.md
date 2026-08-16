# Replacing a Database/Workspace Item

In ASCET you can replace a database/workspace item and all the references to that item in other components or projects completely. This option is particularly important if you are working with a configuration management tool and need to merge divergent development streams for the same system.

To replace an item, proceed as follows:

1. In the 1 Database or 1 Workspace list of the Component Manager, select the item that will replace the original item.
1. Do one of the following:
1. In the Select Item window, do the following:
1. In the Confirm window, confirm the command with OK.
1. Confirm by clicking OK.

The original instance of the replacing item retains its identifier and is renamed to <item_name>_copy. A copy of the replacing item with the name <item> is created.

References to the replaced item become references to the replacing item <item>. The replaced item (i.e. the one you selected in step 3) is deleted.

See also

[Example: Replacing Items](Replacing_Items.md)

[Component Manager Options](CM_Options_for_CM.md)

[References on Items](ReferencesonItems.md)

[Glue <item1> with <item2> Dialog Window](CM_GlueWithWindow.md)
