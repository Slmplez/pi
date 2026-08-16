# Assigning a Component or Enumeration as Argument

You can use enumerations and other components as interface elements of SWC. The procedure is described here for an argument of type user-defined. The same procedure can be used for a complex return value.

From ASCET V6.3.0 on, complex arguments are always explicit references, even though they are not marked with the overlay icon ![](symbol_reference_overlay.gif).

To assign a component as an argument, proceed as follows:

1. [Open the signature editor](asceditsignature.md) for the method to which you want to add the component.
1. From the Arguments list, select the item for which you want to specify the data type (or add a new item).
1. In the Argument Type list, select the entry <user defined>.

A selection dialog window opens for the current database.

1. From the 1 Database or 1 Workspace list, select the component or enumeration you want and click OK to close the dialog.

The selected component or enumeration appears in the Argument Type pane on the interface editor.

1. Click OK to store the changes you made to the signature.

See also

[Editing the Signature of a Runnable or Method](asceditsignature.md)

[Creating a Matrix Argument](ascmatrixargument.md)
