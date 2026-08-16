# Extras Menu

This menu contains the following options:

Browse to Parent Component

Not available for projects.

Browse to Parent Hierarchy

Displays the including graphical hierarchy (see [Graphical Hierarchies](BlockDiagramEditorEnglishUS.chm::/GraphicalHierarchies.htm)).

Show Path

Shows the path of an element or included component.

Show Occurrences

Shows all graphical occurrences of the item.

Copy Path to Clipboard

Copies the path of an element or included component to the clipboard.

| Column 1 | Column 2 |
| --- | --- |
| Model Path | Model Path. |
| Model asd:// Link | Path in ASCET protocol format that allows operating/referencing an ASCET component in a model as hyperlink. |
| Database Path | Database/Workspace Path. |
| Database asd:// Link | Path in ASCET protocol format that allows operating/referencing an ASCET component in the database/workspace as hyperlink. |

Create ASCET Link

Creates an [ASCET link](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm) for an element selected in the Outline tab or the Graphics tab. The link opens the project in the project editor and (except for the self element, i.e. the root of the element tree) highlights the element in the Outline tab.

Check Dependency

Checks whether the allocation of formal parameters to the model parameters is correct.

Resolve Globals

Automatically creates a global element for each imported element in the component for which there is no exported element.

If a component in the project contains an imported reference, Resolve Globals creates an exported reference in the project. This reference is not initialized; you have to initialize the exported reference manually.

Show Unused Elements

Opens the Search Results view and lists all unused elements defined in the project.

Copy C Code from

Copies C-code from another target (see [Copying the C Code for an Entire Project](PE_copyccode.md)).

Bound acquisition task by name

Changes the way acquisition tasks in online experiments are referenced from referenced by number to referenced by name. See also the ASCET-RP user's guide.

Replace Formulas

Replaces a formula with another (see [Replacing a Formula Recursively](replaceformula.md)).

Update Implementation

Updates all implementation of a project (see [Updating All Implementations](updateimplement.md)).
