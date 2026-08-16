# Selecting a Repository

Proceed as follows to select a software version control repository for use with your ASCET data:

1. In the [SCM Menu](SCM_ASCET-SCM_Menu.md), open the [Source Control](SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) submenu and select Show Source Control Settings.
1. In this dialog box, click on the magnifying glass icon to the right of the [Repository URL](SCM_Subversion_Settings_Dialog_Box.md#Repository_URL) edit field.
1. Use this browser to select the URL of the repository you want to use with your ASCET data.
1. When you have selected the URL, you may want to test the connection to this URL by pressing the [Test Connection](SCM_Subversion_Settings_Dialog_Box.md#Test_Connection) button in the [Subversion Settings Dialog Box](SCM_Subversion_Settings_Dialog_Box.md).
1. Optionally, when you place items under version control via [Add and Commit](SCM_ASCET-SCM_Menu.md#Add_and_Commit), you can [select or create repository folders](SCM_Selecting_or_Creating_a_Repository_Folder_for_an_Item.md) for these items.

For the sake of performance, please select the URL of a repository that does not contain a large amount of other data (e.g. use a subfolder for ASCET-SCM if necessary). Depending on the size of the repository, [Update](SCM_ASCET-SCM_Menu.md#Update) operations might take a long time.

If TortoiseSVN is installed on the system, a button behind the [Repository URL](SCM_Subversion_Settings_Dialog_Box.md#Repository_URL) edit field is enabled which opens TortoiseSVN "Repo-Browse" with the currently selected URL. If you select another URL in the Repository Browser, it can be entered as the ASCET-SCM Repository URL via the standard copy & paste mechanism.

To select a new repository and choose a different working copy path as described above, the current source control bindings have to be removed first.

See also

[Repository](SCM_Repository.md)

[Subversion Settings Dialog Box](SCM_Subversion_Settings_Dialog_Box.md)

[Typical Workflow - Using Subversion for Revision Control](SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)
