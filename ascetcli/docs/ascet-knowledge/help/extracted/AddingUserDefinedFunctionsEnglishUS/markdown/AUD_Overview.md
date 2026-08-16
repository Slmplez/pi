# Overview

It is possible to define your own functions to make it easier to work with ASCETadd-ons (e.g. version management) and external programs. These are:

- Your own menus in different windows
- An autostart action (executed when ASCET is started)
- A shutdown action (executed when ASCET is shut down)

These are specified in *.ini files which are either stored in a subdirectory of the ASCET installation, ETAS\Ascet<n>\Executer (<n> being the ASCET version number), or of the data directory, ETASData\Ascet<n>\Executer. The Executer subdirectory can in turn contain subdirectories.

To keep the content of the Executer subdirectory in case of an update or re-installation of ASCET, you have to place it below the data directory (ETASData\Ascet<n>).

The *.ini files are only read when ASCET is started, later changes are only effective after a restart. The syntax of these files corresponds to the Windows *.ini format.

Each *.ini file consists of one or more sections whose names are in square brackets. The following sections are available:

- [<NAME>]

Defines a new menu item. You can select any name you wish, but each name can only occur once in an *.ini file. Please refer to [Menu Item Definition](defining__menu_items.md).

- [AUTOSTART]

Defines the autostart action. See also [Defining an Autostart Action](AUD_defining_autostart_action.md).

- [SHUTDOWN]

Defines the shutdown action. See also [Defining a Shutdown Action](AUD_defining_shutdown_action.md).

See also

[Menu Item Definition](defining__menu_items.md)

[Defining an Autostart Action](AUD_defining_autostart_action.md)

[Defining a Shutdown Action](AUD_defining_shutdown_action.md)

[Structure of the Script Files](structure_script_file.md)

[Hints for Defining Menu Items](Hints_for_Defining_Menu_Items.md)

[Window Names](Names_of_the_Windows.md)
