# Setting a Path for External Code Storage

Proceed as follows to select a path for external code storage.

1. [Activate external code storage](PE_ActivateExternalCodeStorage.md).
1. If you are working with a component (class, module, SWC), [open the component's default project](PE_editdefaultproject.md).
1. In the project editor, click on the ![](buttonProjectProperties.gif) button to open the Project Properties window.
1. Go to the [Code Storage node](PE_CodeStorageNode.md).
1. Enter or select the Code Storage Root Path.
1. Close the Project Properties window with OK.
1. Click Yes to copy the files or No to leave them in the old location.

If you specified a valid path name, the next time you generate code for this project, the generated code is stored at the specified path. If you specified an invalid path name, code generation aborts and an error message appears in the ASCET monitor window. A path name is invalid in the following cases:

- you entered an invalid placeholder
- the resolved path name is not a valid Windows path name
- the resolved path does not exist and cannot be created

See also

[Activating External Code Storage](PE_ActivateExternalCodeStorage.md)

[Editing a Default Project](PE_editdefaultproject.md)

[Code Storage Node](PE_CodeStorageNode.md)

[External Code Storage](PE_ExternalCodeStorage.md)
