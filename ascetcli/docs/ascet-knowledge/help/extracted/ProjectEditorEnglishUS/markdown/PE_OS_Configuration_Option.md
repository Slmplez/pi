# OS Configuration Node

The options in this node are only available if one of the ASCET-RP targets ES910 or RTPRO-PC or an ASCET-SE target (except EHOOKS) is selected in the [Build](Build_Options.md) node.

##### OS Template File

Path and name of a template file used for external generation of OS-related files.

##### Enable OS Configuration

Activates/deactivates external processing of operating system specifications by external tools.

The options Include Paths, Library Paths, Libraries, Configuration Tool Options, and OIL File, are only available if Enable OS Configuration is activated. See the descriptions in the Project Properties window

##### Interpolation Alias Mapping

Defines the mapping of alias interpolation routines to concrete interpolation routines.

##### AUTOSAR XML Configuration File

Only available if the ANSI-C target and an RTE-AUTOSAR * operating system are selected.

A configuration file for the generation of AUTOSAR XML code.

![](button_new.bmp) opens a file selection dialog for the configuration file.

![](button_edit.gif) opens the ARXML Configuration Settings window where you can edit the options.

##### Memory Sections Configuration File

Allows the project-specific selection of a memory class declaration file, i.e. a memorySections.xml file. The default is set to %TARGET%\memorySections.xml, where %TARGET% is a macro for the path to the currently selected target.

The memory classes defined in the selected file are visible in the Memory Location of * combo boxes in the implementation editors.

See also the ReadMe_memorySections.html files in the target directories.

##### Edit Operating System Tool Settings

Link to the appropriate subnode of the Operating System node in the ASCET options window. The options there are explained in the options window.

See also

[Build Node](Build_Options.md)

[Configuring the AUTOSAR XML Output](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCconfigureAUTOSARXMLOutput.htm)

[Component Manager - Operating System Node](ComponentManagerEnglishUS.chm::/cm_operating_system_node.htm)

[Editing Implementations - Overview](ImplementationEditorEnglishUS.chm::/IEd_Overview.htm)
