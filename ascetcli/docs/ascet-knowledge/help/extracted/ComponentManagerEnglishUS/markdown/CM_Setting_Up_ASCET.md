# Setting Up ASCET

This help component describes the ASCET-MD options. Add-on products, such as ASCET-RP, can add their own options, these are described in the respective add-on documentation.

You can set various options in ASCET. There are two types of options: general and user-specific options. Both types are managed in the Options window and stored in XML files. When ASCET is booted for the first time after installation, these XML files do not exist. They are created automatically and assigned the default settings of the system or—if an older ASCET version was installed—the settings of the older version.

General options (![](icon_statopt.gif) icon) are specific to the ASCET installation on your workstation. They comprise the target directory for code generation, several paths, code preview settings, and the selection of single- or multi-user mode for running the program.

General options are stored in the data directory in the stationSettings.xml file.

User-specific options (![](icon_usopt.gif) icon) comprise a variety of topics, e.g., settings for diagrams, export/import file paths, etc. With these options, you can create a user environment customized to meet your particular needs. Changes to the user options are stored separately for each user if user selection is activated on startup. New user profiles start with the default settings.

User-specific options are stored in the directory of the relevant user (ETASData\ASCET<n>\User\<username>, <n> being the ASCET version) in the userSettings.xml file.

Before setting user-specific options, you should decide whether your ASCET installation is to run in single- or multi-user mode to make sure your options are stored in the correct user profile.

Options with invalid values are indicated by a red overlay icon containing a white X: ![](icon_statoptinvalid.gif) and ![](icon_usoptinvalid.gif).

Options for external tools (compiler, OS, interpolation routines, ...) are indicated by a green E as overlay icon: ![](icon_externalOption.gif) The values of these options are stored in the data directory in the externalToolsSettings.xml file.

User-defined options, also called [external options](CM_External_Options.md), are also indicated by the green E as overlay icon: ![](icon_externalOption.gif)

See also

[Setting ASCET Options](SettingASCET.md)

[User Interface of the ASCET Options Window](cm_user_interface_of_the_ascet_options_window.md)

[External Options](CM_External_Options.md)

[Path Macros](CM_PathMacros.md)

[Name T](CM_NameTemplates.md)emplates
