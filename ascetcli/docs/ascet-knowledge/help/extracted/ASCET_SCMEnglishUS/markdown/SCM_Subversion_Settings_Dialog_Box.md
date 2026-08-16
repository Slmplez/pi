# Subversion Settings Dialog Box

This dialog box enables you to view and/or modify settings for Subversion instance you are using for software version control. It can be displayed via the Show Source Control Settings command in the [Source Control](SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) submenu of the [SCM menu](SCM_ASCET-SCM_Menu.md).

##### Repository Settings

Repository URL: Displays the URL of the Subversion repository you are currently using to handle ASCET data. This URL will be used as the basis for any SVN operation in ASCET. All ASCET items will be placed below this URL in a folder structure similar to the structure within the ASCET database or workspace. See also [Selecting a Repository](SCM_Selecting_a_Repository.md).

Current restriction: The repository URL has to contain at least two levels of folders (e.g. file:///c:/repository/v_trnk/). If the URL is "too short", ASCET-SCM cannot access it.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_OpenRepo.gif): Opens the repository browser to check the URL.

User Name: Login user name to be used for selected repository. The Windows user name is set as the default value. This entry may need to be adapted to the current repository environment (e.g. if a domain is needed). If a password is required the user may be prompted to enter it via a separate login dialog provided by the Subversion driver.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Test Connection: When you press this button, ASCET-SCM attempts to connect to the currently selected repository URL. If this connection works, a separate dialog box return the message Repository URL tested successfully. If you do not press this button, the connection will be tested after you close this dialog box.

##### Subversion Driver Information

This section displays (read-only) data pertaining to the Subversion driver you are currently using.

Subversion Driver Version: Displays the version of the Subversion driver you are currently using.

Supported Subversion Tool: Displays the version of the Subversion tool you are currently using.

Subversion Installation Path: Displays the path where the Subversion instance you are using is installed.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) OK

Closes the dialog box and accepts the settings.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

Closes the dialog box and discards the settings.

See also

[Tool Options for ASCET-SCM](SCM_Tool_Options_for_ASCET-SCM.md)
