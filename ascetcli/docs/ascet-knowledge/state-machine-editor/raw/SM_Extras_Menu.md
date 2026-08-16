# Extras Menu

This menu bar contains the following menus:

##### Browse to Parent Component

Opens an editor for the including component. (The option is only available if an included component is being edited.)

##### Browse to Parent Hierarchy

Displays the including graphical hierarchy.

##### Show Path

Shows the path of an element or included component.

##### Show Occurrences

Shows all occurrences of the element or included component.

##### Copy Path to Clipboard

Copies the path of an included component to the clipboard.

| Column 1 | Column 2 |
| --- | --- |
| Model Path | Model Path. |
| Model asd:// Link | Path in ASCET protocol format that allows operating/referencing an ASCET component in a model as hyperlink. |
| Database Path | Database/Workspace Path. |
| Database asd:// Link | Path in ASCET protocol format that allows operating/referencing an ASCET component in the database/workspace as hyperlink. |

##### Create ASCET Link

Creates an [ASCET link](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm) for an element or included component selected in the Outline tab or the drawing area. The link opens the component in the state machine editor and (except for the self element, i.e. the root of the element tree) highlights the element in the Outline tab or drawing area.

##### Default Project

Allows editing the default project used for experimenting with components.

| Column 1 | Column 2 |
| --- | --- |
| Open | Opens an editor for the default project. |
| Resolve Globals | Automatically creates a global element for each imported element in the component for which there is no exported element. For each explicit reference among the imported elements, Resolve Globals creates an exported reference in the default project. These exported references are not initialized; you have to initialize the exported references manually. |
| Delete Unused Globals | Deletes unused global elements. |

Check Dependency

Checks whether the allocation of formal parameters to the model parameters is correct.

Show Unused Elements

Opens the Search Results view and lists all elements from the Outline tab that do not appear in a diagram of the state machine. See also [Searching/Deleting Unused Elements](sm_unusedelements.md).

See also

[ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)

[Default Projects](ProjectEditorEnglishUS.chm::/PE_defaultproject.htm)

[Initialization of Explicit References](IntroductionEnglishUS.chm::/INT_InitExplicitReferences.htm)

[Searching/Deleting Unused Elements](sm_unusedelements.md)
