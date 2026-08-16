# Tool Options for ASCET-SCM

The ASCET Options window is opened with the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_ASCEToptions.gif) Options button in the ASCET component manager or the component editors.

The ASCET Options window provides the node Integration\Source Control for setting up ASCET-SCM. This node includes the following options:

##### Export Format

Defines the format used for components export. This can be either the "old" binary export format (*.exp), the format (*.amd) offered by ASCET V5.2.0 or later versions, or a combination of both (combined binary+XML format)

##### Preferred Import Format

Defines which type of export file format (*.exp or *.amd; see above) is imported if multiple variants are available in the SCM [repository](SCM_Repository.md).

##### Local Working Directory

Specifies the path of the local working directory used by the SCM tool and thus for ASCET export/import. This directory is also used by the [SVN driver](SCM_Driver_Selection_Dialog_Box.md) to create a local copy of the selected [repository](SCM_Repository.md).

In Microsoft Windows®, folder and file names are limited to a maximum of 255 characters in length. Please bear in mind that exchange data will be placed within the local working directory using the same folder structure as in the ASCET database or workspace. (ASCET has no limit of 255 characters for its folder structures!). For SVN data, the folder structure comprises <Local working directory> + <SVN repository URL (following ":/") + <ASCET folder structure> + <ASCET file name with extension>.

##### Server Logfile

Specifies the file used for logging all activities during ASCET-SCM operations. Please send this file to ETAS support if any problems occur.

##### Custom Diff Tool

Specifies the installation path and filename of a tool (e.g. ASCET-DIFF) for comparing ASCET export data. This tool can be used to compare different versions of ASCET items, e.g. via the [Show Log](SCM_ASCET-SCM_Menu.md#Show_Log) command.

##### Custom ASCET Version String

Specifies the ASCET version string used to identify the ASCET version in the [repository](SCM_Repository.md). This version string is used by SCM tool interfaces to define the export version of ASCET models.

##### Skip Unmodified Items

If this option is checked, all items in a list will be ignored if they have not been changed locally. Consequently:

- When you [commit](SCM_Committing.md) a folder, items that have not been modified will not be committed.
- When you load items, these will not be imported if the same revision is selected as the one currently loaded in ASCET and no local changes have been performed.

##### Logging Level

Specifies the level at which logging is done.

##### Allow commit with missing references

If activated (default), commiting editions is possible even if missing references are detected during commit.

If deactivated, commiting an edition with missing references is not possible.

[Appearance](SCM_Appearance_Options_for_ASCET-SCM.md) options are provided on a separate page.

See also

[Setting up Subversion for Use with ASCET-SCM](SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md)
