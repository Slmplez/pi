# Targets Node

The Targets node contains subnode structures for all installed ASCET targets. For the meaning of the target-specific options, refer to the descriptions in the Options window.

Some options are available for all targets, some are available for one or more target categories or targets.

The settings of each target apply to all projects that use a particular target. The settings are stored in the data directory ([path macro](CM_PathMacros.md) %DATA%), in an XML file named targetSettings_<target name>.xml. These files are not deleted during a re-installation of ASCET. To restore default settings for a target, remove the respective targetSettings_<target name>.xml file or use the System Defaults button.

##### Build Subnode

- Using External Build Tool

This option and its subordinated options are only visible when the target.ini file contains an entry buildTools.

- Generating SCOOP-IX

This option replaces the GenerateSCOOP-IX entry in the codegen.ini file.

- Generating Message Copy

This option depends on the msgCopySemantics entry in the target.ini file.

At present, only the EHOOKS target provides a message copy semantics in target.ini.

- Resolve System Constants

For the meaning of this option, refer to the descriptions in the Options window.

This combo box replaces the ResolveSystemConstants entry in the codegen.ini file.

- Cont Implementation Type

Only changeable for ASCET-SE targets, including the EHOOKS target.

For the meaning of this option, refer to the descriptions in the Options window.

For EHOOKS, this combo box replaces the Bypass Implementation Override combo box in the project properties of ASCET V6.2.

- Function Name of memcpy

This option is available for all targets.

##### Name Templates and Filename Templates subnodes

The Name Templates\ASAM-2MC subnode is only available for the EHOOKS target.

Name templates are described in [Name Templates](CM_NameTemplates.md). A list of valid template parameters for each option is given in the descriptions in the Options window.

##### Name Templates\ANSI C Subnode

- Generating Access Macros

This option and its child options are only available for ASCET-SE targets.

This option replaces the Generate Access Macros for field in the Production Code node of the Project Properties window.

- Record Type

This option is available for all targets.

- Externally Defined Name (* Element)

These options are only available for the EHOOKS target.

See also

[Path Macros](CM_PathMacros.md)

[Name Templates](CM_NameTemplates.md)
