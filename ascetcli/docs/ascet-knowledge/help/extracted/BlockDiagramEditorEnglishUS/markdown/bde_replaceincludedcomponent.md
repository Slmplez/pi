# Replacing an Included Component

Projects and several components (i.e. modules, classes, AUTOSAR software components, state machines) can contain other components. To replace an included component, proceed as follows.

1. In the Outline tab of the project or component editor, select the included component you want to replace.
1. Do one of the following.
1. Click Yes to continue.
1. From the 1 Database or 1 Workspace list, select the component you want to use as replacement.
1. Click OK to perform the replacement.
1. Continue with All or Selected.
1. Answer the question with Yes (all component instances in the project contest are replaced), No (only the current instance is replaced) or Cancel.

The new component replaces the old component.

In a block diagram, existing connections are restored if the new component contains pins (i.e. the interface elements) with identical names as the old component.

The type of the new component's pins is not checked; you must remove illegal (e.g., between log and cont) and non-matching (e.g., between cont and limitInt) connections manually.

In a project, process assignments to tasks are restored if the new module contains processes with identical names as the old module.

See also

[Connecting Diagram Elements](Connectdiagram.md)

[Project Editor - Assigning a Process to a Task](ProjectEditorEnglishUS.chm::/assignprocess.htm)
