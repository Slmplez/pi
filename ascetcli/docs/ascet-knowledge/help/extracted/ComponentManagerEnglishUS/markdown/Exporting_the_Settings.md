# Exporting Message Configuration Settings

You can export your message configuration settings to an XML file and you can import this kind of configuration from an XML file. To export the settings, proceed as follows:

1. Open a CodeGen Message Configuration window.
1. Click the ![](button_exportmsgconfig.gif) button.

A confirmation window opens.

1. If you do not want the confirmation window to be displayed in future, disable Show next time. (see [Confirmation Dialogs Node](CM_Options_for_Confirmation_Dialogs.md))
1. Confirm the saving of your changes with OK.

The Windows file selection dialog window opens. *.xml is specified as format.

1. Set path and name of the export file.
1. Click Save.

The message configuration settings are written to the specified XML file.

Project-specific message configuration files contain a group named CodeGenMessageConfiguration, whereas global message configuration files contain a group named ToolSettings and options named Global*.

See also

[Importing Message Configuration Settings](Importing_the_Settings.md)

[Confirmation Dialog Options](CM_Options_for_Confirmation_Dialogs.md)
