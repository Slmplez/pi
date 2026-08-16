# Copying Operating System Settings

The settings of the operating system for the current target can be copied to another target, or the settings from another target can be copied to the current target. Switching between targets is done in the [Build](Build_Options.md) node of the Project Properties window.

Since the semantics of the attributes differ, most attributes are set to default values when copied from an ERCOSEK target to an RTA-OSEK target and vice versa. It is the responsibility of the user to check the attributes for correctness.

To copy operating system settings, proceed as follows:

1. In the project editor, select the OS tab.
1. Do one of the following:
1. Select a combination of target and operating system and click OK.

The settings are either copied from the current to the selected combination, or the other way round, depending on which command was chosen.

See also

[Build Node](Build_Options.md)

[Adjusting the Project Settings](adjustcode_gen.md)

[Project Properties Window](PE_Settings_for_Window.md)

[Project Settings](projectsettings.md)
