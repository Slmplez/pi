1. In the iconID="<name>" entry of a <Command ... />, enter the icon you want to use for this command.
1. In the label="<text>" entry, enter a name for the command.
1. In the validItemVersionStates="<one or more states>" entry, enter one or more item states that shall be able to use the command.

| Column 1 | Column 2 |
| --- | --- |
| no_scm | The database/workspace item is not under source control. |
| revision | The database/workspace item is under version control, but currently not checked out. |
| lockedrevision | The database/workspace item is under version control and checked out. |
| modified | The database/workspace item has been modified. |
| The same states are available for configurations; the configuration states are named configuration.* . |  |

To specify more than one state, separate the state names with commas (no blanks).

Commands thus marked are available for items in the specified state(s).

See also [Example 1](SCM_CustomizeMenusIcons_Examples.md#Example1) in [Customizing Menus and Icons - Examples](SCM_CustomizeMenusIcons_Examples.md).
