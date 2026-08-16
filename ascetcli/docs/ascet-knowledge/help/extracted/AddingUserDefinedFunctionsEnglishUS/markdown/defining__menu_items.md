# Menu Item Definition

The section of the *.ini file which defines a menu item is as follows:

[<Name>]

WINDOW =<window name>

MENU =~<menu name>

SUBMENU =~<submenu name>

ITEM =~<menu item name>

DESCRIPTION ="<text>"

SEPARATOR =<separator>

FILE =<filename.txt>

The terms to the left of the equals sign must be written in block caps.

The variables have the following significance:

- <Name>

The name of the section. The name must be unique within the *.ini file. No difference is made between upper and lower case. For example [Input] and [INPUT] are the same.

Value: any, but unique

- <window name>

The name of the window in which the menu item is generated.

Value: see [Window Names](Names_of_the_Windows.md)

- <menu name>

The name of the menu which exists, or is generated, in the specified window.

Value: any

- <submenu name>

The name of the submenu which is generated in the <menu name> menu in the specified window.

Value: any

- <menu item name>

The name of the menu item which is generated in the <menu name> menu or in the <submenu name> submenu.

Value: any

The ~ in menu name, submenu name, and menu item name is used to denote the mnemonic key. You can place the ~ anywhere in the name, but make sure that each mnemonic (including the existing ones) is used only once in a given window.

- <text>

A description of the menu item which is only required for documentation purposes.

Value: any

- <separator>

Specifies whether a separator is generated before or after the menu item. The line can be omitted if there is to be no separator (Nothing).

Value: Before / After / Nothing

- <filename>

The script file <filename>.txt is executed when the menu item is selected. The structure of these files is explained in [Structure of the Script Files](structure_script_file.md).

Value: any

If several *.ini files are created, they are evaluated in alphabetical order. The menu items which are defined in a file called asd_menu.ini are further up the relevant menu than items in the same menu which are defined in my_menu.ini. Within the same *.ini file, the menu items are created in the order in which they are defined.

See also

[Structure of the Script Files](structure_script_file.md)

[Defining Menu Items](to_define_menu_items.md)

[Window Names](Names_of_the_Windows.md)

[Hints for Defining Menu Items](Hints_for_Defining_Menu_Items.md)
