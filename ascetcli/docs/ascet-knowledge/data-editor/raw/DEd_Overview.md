# Overview

When specifying a component, you can assign an initial value to each element in your specification. All of these values can be changed at a later stage. You can specify different data sets, i.e. sets of initialization values between which you can toggle, or you can change individual values during experimentation. This section describes the different editors for the various kinds of elements.

Usually a data editor is first called from within the component development environment, e.g. the block diagram editor, to assign a default value to an element. Then the editor can be opened again from within the experimentation environment to calibrate the value of the element during an experiment ([Setting up a Numerical Editor](ExperimentationEnglishUS.chm::/setup_numerical_editor.htm)). Data editors can also be used to define data sets for components or projects.

Data sets are independent from implementations ([Editing Implementations](../../implementation-editor/raw/IEd_Overview.md)). Nevertheless inconsistencies between both can arise. In the context of a project, the value of an element defined in its data set can exceed the value range defined in the implementation. It is the user’s responsibility to use consistent project settings.

At code generation time, the initialization values of basic elements must fit the value ranges defined by their implementations. Otherwise an error message is generated for parameters, a warning for variables.

See also

[Setting up a Numerical Editor](ExperimentationEnglishUS.chm::/setup_numerical_editor.htm)

[Editing Implementations - Overview](../../implementation-editor/raw/IEd_Overview.md)

[Editors for Scalar Types](DEd_editors_scalar_types.md)

[The Editor for Combined Types (Table Editor)](DEd_editor_combined_types.md)

[Data Sets](DEd_data_sets.md)

[Special Characteristic Table Types](DEd_specCharTables.md)
