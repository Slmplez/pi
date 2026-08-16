# Merged CHM Content

## Overview

_Source: `markdown/AUD_Overview.md`_

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

Defines a new menu item. You can select any name you wish, but each name can only occur once in an *.ini file. Please refer to [Menu Item Definition](markdown/defining__menu_items.md).

- [AUTOSTART]

Defines the autostart action. See also [Defining an Autostart Action](markdown/AUD_defining_autostart_action.md).

- [SHUTDOWN]

Defines the shutdown action. See also [Defining a Shutdown Action](markdown/AUD_defining_shutdown_action.md).

See also

[Menu Item Definition](markdown/defining__menu_items.md)

[Defining an Autostart Action](markdown/AUD_defining_autostart_action.md)

[Defining a Shutdown Action](markdown/AUD_defining_shutdown_action.md)

[Structure of the Script Files](markdown/structure_script_file.md)

[Hints for Defining Menu Items](markdown/Hints_for_Defining_Menu_Items.md)

[Window Names](markdown/Names_of_the_Windows.md)


---

## Menu Item Definition

_Source: `markdown/defining__menu_items.md`_

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

Value: see [Window Names](markdown/Names_of_the_Windows.md)

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

The script file <filename>.txt is executed when the menu item is selected. The structure of these files is explained in [Structure of the Script Files](markdown/structure_script_file.md).

Value: any

If several *.ini files are created, they are evaluated in alphabetical order. The menu items which are defined in a file called asd_menu.ini are further up the relevant menu than items in the same menu which are defined in my_menu.ini. Within the same *.ini file, the menu items are created in the order in which they are defined.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[Defining Menu Items](markdown/to_define_menu_items.md)

[Window Names](markdown/Names_of_the_Windows.md)

[Hints for Defining Menu Items](markdown/Hints_for_Defining_Menu_Items.md)


---

## Hints for Defining Menu Items

_Source: `markdown/Hints_for_Defining_Menu_Items.md`_

# Hints for Defining Menu Items

If you want to define several menu items in the same or in different ASCET windows, you have to create a section for each individual menu item. Constructions like the following do not work, the first definition is ignored.

[EXPORT]

WINDOW=databasebrowser

MENU=~My Menu

ITEM=~Open Text Editor

DESCRIPTION=open external text editor

FILE=openeditor.txt

ITEM=O~pen PSP

DESCRIPTION=opens a screenshot tool

FILE=openpsp.txt

The sections can either be in the same or in separate *.ini files. The advantage of using separate files is that it is easier to control the order of the menu items in a menu using the file names.

If you use one *.ini file for several items, make sure that each name is only used once. If a name occurs a second time, the first definition is executed a second time regardless of what the second definition is.

An example: The following sections are to be used to generate the menu My Menu with option Open PSP, in the project editor and the menu My Menu with option Open Text Editor in the Component Manager.

[Input]

WINDOW=projecteditor

MENU=~My Menu

ITEM=O~pen PSP

DESCRIPTION=opens a screenshot tool

SEPARATOR=After

FILE=openpsp.txt

[INPUT]

WINDOW=databasebrowser

MENU=~My Menu

ITEM=~Open Text Editor

DESCRIPTION=open external text editor

SEPARATOR=Before

FILE=openeditor.txt

As there is no distinction between upper and lower case, the names of the sections are identical and the first section is ignored, i.e. only Open Text Editor is generated under My Menu in the Component Manager.

![](markdown/executer_once.gif)

See also

[Defining Menu Items](markdown/to_define_menu_items.md)


---

## Window Names

_Source: `markdown/Names_of_the_Windows.md`_

# Window Names

The following are the names of the windows into which menu items can be inserted.

| Column 1 | Column 2 |
| --- | --- |
| Name of the Window | ASCET Window |
| mainwindow or databasebrowser | Component Manager |
| projecteditor | Project editor |
| blockdiagrameditor | Block diagram editor |
| atomicsoftwarecomponenteditor | Software component editor |
| smeditor | State machine editor |
| esdleditor | ESDL editor |
| ccodeeditor | C code editor |
| conttimeblockdiagrameditor | Block diagram editor (CT blocks) |
| conttimeesdleditor | ESD editor (CT blocks) |
| conttimeccodeditor | C code editor (CT blocks) |
| booleantableeditor | Boolean table editor |
| conditionaltableeditor | Conditional table editor |
| datainterfaceeditor | Editors for SenderReceiver interfaces, NVData interfaces and calibration interfaces You can add menu items only to all three editors together. |
| clientservereditor | Editor for ClientServer interfaces |
| recordeditor | Record editor |
| datadialog | Data for ... window |
| impldialog | Implementation editor |
| onlinesimulation | Online experiment environment |
| offlinesimulation | Offline experiment environment |
| intecriobackanimation | Experiment environment for back animation with INTECRIO |
| incabackanimation | Experiment environment for back animation with INCA |


---

## Defining an Autostart Action

_Source: `markdown/AUD_defining_autostart_action.md`_

# Defining an Autostart Action

An autostart action is defined in the [AUTOSTART] section of the *.ini file. The section can be anywhere in the *.ini file, but can occur only once, even if several *.ini files are used. It contains only one line, FILE=<filename>.

Example:

[AUTOSTART]

FILE=start.txt

The start.txt script file is executed at the start of ASCET.

The autostart function is used to execute configurations for file operations (e.g. adapting templates for code generation, deleting directories) when ASCET is started. This results in a unique, reproducible situation. An editor or any other tool can also be invoked to execute the necessary preparatory work and settings for the session. A message (see [OBJECT](markdown/object.md)) can provide information on the settings made.

An example of this kind of script file:

EXECUTE c:\Programme\TextPad 4\TextPad.exe C:\ETAS\Ascet6.3\target\trg_c16x\codegen.ini

OBJECT message: codegen.ini is updated

You cannot access COM-API with the autostart function as the automation server is not started at this time.

See also

[OBJECT](markdown/object.md)


---

## Defining a Shutdown Action

_Source: `markdown/AUD_defining_shutdown_action.md`_

# Defining a Shutdown Action

A shutdown action is defined in the [SHUTDOWN] section of the *.ini file. The section can be anywhere in the *.ini file, it contains only one line, FILE =<filename>.

Example:

[SHUTDOWN]

FILE=shutdown.txt

When ASCET is shut down, the shutdown.txt script file is executed.

You cannot access COM-API with the shutdown function as the automation server has already been shut down at this time.


---

## Structure of the Script Files

_Source: `markdown/structure_script_file.md`_

# Structure of the Script Files

The script files (line File =... in the *.ini file) are written as text files. Nine keywords are used to specify the various actions:

EXECUTE, NOWAIT, OBJECT, SELECTOR, MENUITEM, FILE, FORK, SEND, POST.

The use of these keywords is explained in the following sections.

Unlike with the *.ini files, changes to the script files are effective as soon as the relevant menu item is next selected.

See also

[EXECUTE](markdown/execute.md)

[NOWAIT](markdown/nowait.md)

[OBJECT](markdown/object.md)

[SELECTOR](markdown/selector.md)

[MENUITEM](markdown/menu_item.md)

[FILE](markdown/file.md)

[FORK](markdown/fork.md)

[SEND](markdown/send.md)

[POST](markdown/post.md)


---

## EXECUTE

_Source: `markdown/execute.md`_

# EXECUTE

The keyword EXECUTE is used to start an external program or a batch file. As long as the external program is running, the execution of the script file is interrupted.

Examples:

- EXECUTE C:\ETAS\Ascet6.3\import.bat invokes the batch file import.bat in the directory C:\ETAS\Ascet6.3.
- EXECUTE C:\WINNT\system32\notepad.exe starts the Notepad text editor.

The interruption of the execution can have undesired results. If, for example, a menu item open PSP is added to My Menu to make it easier to create screenshots, the following happens:

- The menu item invokes the script file with the following content:

OBJECT popWindow: BDE

EXECUTE c:\Programme\Paint Shop Pro 5\psp.exe

- The first line results in the block diagram editor popping up. The second opens the image processing program.

But because the execution of the script file is interrupted, the block diagram editor is not updated.

Swapping the lines around does not solve the problem because this would result in the block diagram editor popping up after the image processing program has been closed.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[NOWAIT](markdown/nowait.md)


---

## NOWAIT

_Source: `markdown/nowait.md`_

# NOWAIT

The keyword NOWAIT is used in exactly the same way as EXECUTE. The execution of the script file is not, however, interrupted here.

Example:

The example is the same as at the end of the previous section, but NOWAIT and not EXECUTE is now used in the script file.

OBJECT popWindow: BDE

NOWAIT C:\Program Files (x86)\Corel\Corel Paint Shop Pro Photo X2\Corel Paint Shop Pro Photo.exe

Again the first line results in the block diagram editor popping up. The second opens the image processing program. As the execution of the script file is not interrupted here, the block diagram editor is updated immediately and the screenshot can be taken.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[EXECUTE](markdown/execute.md)


---

## OBJECT

_Source: `markdown/object.md`_

# OBJECT

The keyword OBJECT can be used together with a range of identifiers for different commands.

- help: <editor>

Displays the exe_hlp.txt help file in the specified editor.

Example: OBJECT help: notepad displays the help in the Notepad editor.

The blank after the colon is mandatory for all identifiers. The command cannot be executed if the colon is forgotten.

- log: <editor>

Displays the exe_log.txt log file in the specified editor.

Example: OBJECT log: notepad

- message: <text>

Opens a window with a message for the user.

Example: OBJECT message: Please note: execution is finished! results in the following window:![](markdown/executer_message.gif)

- popWindow: <title>

The ASCET window with the specified name pops up. <title> does not have to be the complete name, part of the name specified in the title bar is sufficient.

Example: OBJECT popWindow: Database – the Component Manager pops up.

- generatePopWindowCommandFile: <filename>

Creates a file with the specified name in which the correct popWindow command is generated for the ASCET window currently active. The required file ending must be specified in <filename>, path specifications are optional.

Example:

OBJECT generatePopWindowCommandFile: pop.txt

generates the pop.txt file with the following contents when invoked from the Component Manager (only ASCET-MD is installed):

OBJECT popWindow: ASCET-MD

- wait: <n>

Interrupts execution of the script file for n seconds.

Example: the lines

OBJECT wait: 5

EXECUTE C:\WINNT\system32\notepad.exe

result in a 5-second delay before Notepad is started.

- windows: <editor>

Displays a list (exe_win.txt) of the Smalltalk names of all open ASCET windows in the specified editor.

Example:

OBJECT windows: notepad

displays the list in Notepad.

See also

[Structure of the Script Files](markdown/structure_script_file.md)


---

## SELECTOR

_Source: `markdown/selector.md`_

# SELECTOR

The keyword SELECTOR is used to invoke a range of predefined commands in the Component Manager or the specification editors.

Example:

Output of object IDs of selected components

SELECTOR executerFileOutSelectedElementsTo: <filename>

creates a file which contains the object IDs. The required file ending must be specified in <filename>, path specifications are optional.

The blank after the colon is mandatory for all predefined commands. The command cannot be executed if the colon is forgotten. If you make path specifications in <filename>, make sure that all subdirectories exist. Otherwise the file cannot be created.

A menu item is added to the Component Manager which invokes the following script file.

SELECTOR executerFileOutSelectedElementsTo: .\Executer\mysel.txt

EXECUTE C:\WINNT\system32\notepad.exe .\Executer\mysel.txt

MENUITEM View>Update

The ControllerTest, WarmUp and Light components are selected and then the menu item is invoked. The following takes place:

- The first line (SELECTOR ...) creates the mysel.txt file in the Executer subdirectory of the installation directory.
- The second line (EXECUTE ...) opens the newly created file in Notepad.

![](markdown/executer_notepad.gif)

- The third line (MENUITEM ...) updates the Component Manager once Notepad has been closed.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[Available SELECTOR Commands](markdown/Available_SELECTOR_Commands.md)


---

## Available SELECTOR Commands

_Source: `markdown/Available_SELECTOR_Commands.md`_

# Available SELECTOR Commands

Available Commands

- executerCollapseAll

Function: collapses the element list in the 1 Database or 1 Workspace field.

Use: in the Component Manager

Syntax:

SELECTOR executerCollapseAll

- executerExpandCollapseSelectedElement

Function: expands and collapses the selected directory in the 1 Database or 1 Workspace field. (Subdirectories are collapsed but not expanded again.)

Use: in the Component Manager

Syntax:

SELECTOR executerExpandCollapseSelectedElement

- executerDeselectElements

Function: undoes the component or element selection.

Use: in the Component Manager as well as the specification editors

Syntax:

SELECTOR executerDeselectElements

- executerFileOutSelectedDiagrams

Function: writes all diagrams and hierarchies of the selected component as well as the components in it to the ASCET installation directory as image files.

This command has no effect on ESDL or C code components.

Use: in the Component Manager

Syntax:

SELECTOR executerFileOutSelectedDiagrams

- executerFileOutSelectedElementsTo

Function: writes the object IDs of the selected elements into the specified file.

Use: in the Component Manager as well as the specification editors

Syntax:

<filename> must contain the file ending, path specifications are optional.

SELECTOR executerFileOutSelectedElementsTo: <filename>

- executerSelectElementFromString

Function: selects the first visible element in the 1 Database or 1 Workspace list (Component Manager) or Elements list (specification editors) whose name starts with the search string <name>.

Elements in collapsed folders or components that correspond to the search string and all following corresponding visible elements are ignored.

Use: in the Component Manager as well as the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerSelectElementFromString: <name>

- executerFileOutDiagrams

Function: writes all diagrams and hierarchies of the edited component to the ASCET installation directory as image files.

This command has no effect on ESDL or C code components.

Use: in the specification editors

Syntax:

SELECTOR executerFileOutDiagrams

- executerFileOutSelectedDiagramTo

Function: writes the path name of the selected diagram of the edited component into the specified file. Images of the selected diagram and the hierarchies contained in it are additionally generated for block diagrams in the ASCET installation directory.

Use: in the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerFileOutSelectedDiagramTo: <filename>

- executerSelectDiagramFromString

Function: selects the diagram that contains the search string <name> but without loading it.

Use: in the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerSelectDiagramFromString: <name>

- executerSelectPage

Function: Opens the specified project editor tab.

Use: in the project editor

Syntax:

The tab name has to be specified exactly.

SELECTOR executerSelectPage: <tab name>

See also

[SELECTOR](markdown/selector.md)


---

## MENUITEM

_Source: `markdown/menu_item.md`_

# MENUITEM

You can use the MENUITEM keyword to invoke an existing menu item from the active window.

Example

Only valid for databases!

The My Menu menu was added in the Component Manager. The menu function Convert Reserved Names invokes the convertnames.txt file with the following contents:

MENUITEM Tools>Database>Convert>Reserved component names

The original comment can be found in the Tools menu, Database submenu, Convert submenu, Reserved component names menu item.

![](markdown/executer_menuitem.gif)

If this menu item is invoked, components that have reserved names are renamed.

See also

[Structure of the Script Files](markdown/structure_script_file.md)


---

## FILE

_Source: `markdown/file.md`_

# FILE

The keyword FILE is used to invoke a script file from a script file. The execution of the first script file is interrupted as long as the second one is being executed.

Example:

File set_access.txt

invokes the set_access.txt script file from the current script file.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[FORK](markdown/fork.md)


---

## FORK

_Source: `markdown/fork.md`_

# FORK

The keyword FORK is used in exactly the same way as FILE to invoke a further script file. The difference between them is that the execution of the first script file is not interrupted.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[FILE](markdown/file.md)


---

## SEND

_Source: `markdown/send.md`_

# SEND

The SEND keyword is used to send a (Windows) message to another running application. ASCET waits until the application has processed the message. The following possibilities to send a message are available:

SEND <class> <message>

SEND <class> <window> <message>

SEND <class> <window> <message> <1param>

SEND <class> <window> <message> <1param> <wparam>

<class>

Is the class name of the application.

<window>

Is the window title of the application.

<message>

Is the name or identifier of the message to be sent.

<1param>

Is the first optional parameter (0 ... 4294967295).

<wparam>

Is the second optional parameter (0 ... 4294967295).

For more details, refer to the Microsoft Windows Win32 interface documentation, checking the SendMessage keyword in particular.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[POST](markdown/post.md)


---

## POST

_Source: `markdown/post.md`_

# POST

The POST keyword is used, like SEND, to send a (Windows) message to another running application. Here, however, ASCET does not wait for the application to process the message.

For more details, refer to the Microsoft Windows Win32 interface documentation, checking the PostMessage keyword in particular.

See also

[Structure of the Script Files](markdown/structure_script_file.md)

[SEND](markdown/send.md)


---

## Defining Menu Items

_Source: `markdown/to_define_menu_items.md`_

# Defining Menu Items

To define menu items, proceed as follows:

1. Do one of the following:
1. Enter a name for the section, e.g., [Input].
1. Enter the window that contains the menu, e.g.
1. Enter a name for the menu, e.g., MENU=~My Menu.
1. If desired, enter a name for the submenu, e.g., SUBMENU=My ~Submenu.
1. Enter the name the menu item will have, e.g.
1. Enter a description, e.g.
1. Enter where you want a separator,e.g.
1. Enter the script file, e.g.

FILE=openeditor.txt.

The next time ASCET is started, My Menu will be generated in the Component Manager.

![](markdown/executer_once.gif)

See also

[Window Names](markdown/Names_of_the_Windows.md)

[Hints for Defining Menu Items](markdown/Hints_for_Defining_Menu_Items.md)

[Menu Item Definition](markdown/defining__menu_items.md)


---

