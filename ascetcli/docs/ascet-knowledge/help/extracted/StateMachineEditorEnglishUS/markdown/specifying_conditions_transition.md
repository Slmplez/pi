# Specifying Conditions and Transition Actions in the Transition Editor

The transition editor, which is used to specify conditions and transition actions, has the same functionalities as the state editor.

To specify conditions and transition actions in the transition editor, proceed as follows:

1. Right-click on the transition.
1. Select Edit Transition from the context menu

or

1. Double-click on the transition.

The transition editor opens.

1. On the Condition or Action tab, select <ESDL> from the combo box.

The input field below the combo box is activated.

1. Type the ESDL code into the input field.
1. Click OK.

The ESDL code of all conditions and actions specified at a state or transition is displayed in the state diagram. For complicated state machines, it can thus quickly become rather crowded.

![](SM_ESDL_crowd_cut%20copy.gif)

You can avoid that by entering a comment in the first line when you add conditions or actions. One-line comments are marked by two leading slashes //, comments of any length are included in /* <Comment> */. In this case, only the comments are displayed.

You can also add the comment lines automatically at a later time.

See also

[Automatic Insertion of Comment Lines](automatic_insertion.md)
