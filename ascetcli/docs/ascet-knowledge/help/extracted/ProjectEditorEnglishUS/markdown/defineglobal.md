# Defining Global Elements in a Project

To define global elements in a project, proceed as follows:

- In the Extras menu, select Global Elements and then click on Resolve Globals to resolve the global elements.

This command must be executed before an experiment can be started with this project.

An exported global element is created automatically for each imported element in a module for which there is no exported element. These two elements are then bound to each other.

If a component in the project contains an imported reference, Resolve Globals creates an exported reference in the project. This reference is not initialized; you have to initialize the exported reference manually.

See also

[Initialization of Explicit References](IntroductionEnglishUS.chm::/INT_InitExplicitReferences.htm)
