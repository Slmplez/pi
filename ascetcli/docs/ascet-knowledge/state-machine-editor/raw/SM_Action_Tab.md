# <Action> Tab

The tabs for entry, static and exit actions consist of the same elements.

- combo box

Used to select the action specification.

| Column 1 | Column 2 |
| --- | --- |
| <undef> | No action defined |
| <ESDL> | Action specified in ESDL in the text field below |
| <method name> | Names of methods, specified in separate diagrams, that can be used as action. The number of entries depends on the number of suitable methods available in the diagrams of the state machine. |

- text field

Input field for action code; only available if <ESDL> is selected in the combo box.

![](BUTTON.GIF) Edit

Opens the selected method <method name> in an appropriate editor. Not available if <undef> or <ESDL> is selected in the combo box.
