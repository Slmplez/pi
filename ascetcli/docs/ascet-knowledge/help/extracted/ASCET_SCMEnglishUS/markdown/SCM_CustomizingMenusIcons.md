# Customizing Menus and Icons

In the driver-specific XML file (e.g., SubversionDriver.xml in the <ASCET installation directory>\SCM\Drivers\ETAS.Subversion directory), you can customize the SCM menu and toolbar.

- The <Command ... /> entries define the available commands.
- The sections <MenuDefinitions>...</MenuDefinitions> and <MenuDefinitions state="Offline">...</MenuDefinitions> contain menu and toolbar definitions for [online and offline mode](SCM_Online_versus_Offline_Mode.md).
- The sections <ASCETMenuBar>...</ASCETMenuBar>, <ASCETToolBar>...</ASCETToolBar> and <ASCETContextMenu>...</ASCETContextMenu> define parts of the [SCM menu](SCM_ASCET-SCM_Menu.md), the [toolbar](SCM_Toolbar_Icons.md) and parts of the Source Control context menu.

Proceed as follows.

1. Open the XML file in a suitable editor.
1. [Edit the <Command ... /> entries.](javascript:void(0);)
1. [Edit the SCM menu in the <ASCETMenuBar>...</ASCETMenuBar> section.](javascript:void(0);)
1. [Edit the SCM toolbar in the <ASCETToolBar>...</ASCETToolBar> section.](javascript:void(0);)
1. [Edit the Source Control context menu in the <ASCETContextMenu>...</ASCETContextMenu> section.](javascript:void(0);)

See also

[Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md)

[SCM Menu (with Version Management)](SCM_ASCET-SCM_Menu.md)

[Toolbar Icons](SCM_Toolbar_Icons.md)
