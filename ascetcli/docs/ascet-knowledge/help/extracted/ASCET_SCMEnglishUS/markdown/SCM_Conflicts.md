# Conflicts

If an ASCET-SCM operation runs into a conflict with the content of the current ASCET database or workspace, the [Conflicts Found Dialog Box](SCM_Conflicts_Found_Dialog_Box.md) is displayed, providing more detailed information about the conflict.

In ASCET-SCM, there are two kinds of conflicts:

- critical conflicts (import not possible) and
- overwrite existing items (intentional or accidental).

Critical conflicts are always shown by the application (also for [Update](SCM_ASCET-SCM_Menu.md#Update) or [Update to Latest](SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision)). The conflicting items are automatically ignored in further actions. Critical conflicts occur if an item to be loaded conflicts with an item in ASCET database/workspace that has the same name and is stored in the same folder but has a different Object ID (OID).

Conflicts that cause existing items to be overwritten in the ASCET database/workspace are only shown if the [Warn of Conflicts](SCM_Appearance_Options_for_ASCET-SCM.md#Warn_of_Conflicts) option is checked in the [Appearance Options for ASCET-SCM](SCM_Appearance_Options_for_ASCET-SCM.md) page of the Tool Options dialog box in ASCET-SCM. For each conflicting item the version to be loaded is shown as well as the local version currently loaded in ASCET.

The Local Modifications Detected message indicates actions that overwrite the local status of items which have already been modified in edit mode.

See also

[Conflicts Found Dialog Box](SCM_Conflicts_Found_Dialog_Box.md)
