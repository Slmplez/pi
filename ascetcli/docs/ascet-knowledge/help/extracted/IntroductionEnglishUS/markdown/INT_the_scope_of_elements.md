# The Scope of Elements

Some elements are used for exchanging data between different components. To establish this, elements can be exported from one component (or from the project) and can be imported in any other component. Here, the matching is done via names. The scope of each element can be defined as one of the following:

- Local elements can only be used within the component that defines them, i.e. in all methods or processes of that component.
- Imported elements are defined in some other component or project, but can be used in the component that imports them. The properties of an imported element can be changed only in the context of the component that defines and exports the element.
- Exported elements are defined in one component and can be accessed by all other components by importing that element.

The scopes Local, Imported and Exported are set in the [properties editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm).

- Method/Process-local elements can only be used in the method/process that define them. Method/Process-local elements are not static and do not have a data set.

Method-/process-local elements are created in the signature editor of a method/process, see [Adding Local Variables to the Method or Process](BlockDiagramEditorEnglishUS.chm::/BDE_Localvariables.htm).
