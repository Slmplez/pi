# References on Items

A reference to an item is created whenever the item is used by or included in another item (e.g. a module that is included in a project is referenced by that project). When moving items between folders, or renaming existing items in folders, all references to that item are updated automatically.

The Component Manager does not automatically resynchronize with the database/workspace if references have been modified. To ensure the consistency of references in the Component Manager, you need to update its references explicitly.

Since references can be cyclic, an item can reference an item that references it. When you delete an item, you should always make sure that the referenced components are not corrupted. ASCET displays a warning and a list of references if you attempt to remove a component that is referenced by other components.

Deleting database/workspace items that are referenced by other components can destroy the referencing components. This can be prevented by replacing the component you want to remove with a new one or a different one.

When a component is replaced, all database/workspace items that have references to the replaced component adjust their references to the replacing component. The replaced component is no longer referenced by any other database/workspace item.

See also

[Updating References in Component Manager](References.md)

[Displaying the References to a Database/Workspace Item](Displayreference.md)

[Replacing the References to a Database/Workspace Item](ReplaceReferences.md)

[Replacing a Database/Workspace Item](ReplaceDatabase.md)
