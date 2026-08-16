# Compatibility of Component Instances

A component instance is created for each component (module, class, AUTOSAR software component, record) that is used in a project. The component instance refers to the component and the [implementation](INT_Overview_Implementations.md). At code generation time, the compatibility of component instances is checked when a new value is assigned to a component reference, passed as an argument of component type, or returned from a method. If the check fails, an error is issued.

Two component instances that do not contain elements with [rescalable implementations](INT_RescalableImplementations.md) are compatible if the following conditions are fulfilled:

1. both instances refer to the same component
1. both instances refer to the same implementation

Two component instances that contain elements with rescalable implementations are compatible if the following conditions are fulfilled:

1. both instances refer to the same component
1. both instances refer to the same implementation
1. both instances use the same rescaling formula

See also

[Definition and Instantiation of Components](INT_Definition_and_Instantiation_of_Components.md)

[Modules](int_modules.md)

[Classes](INT_Classes.md)

[Overview - Software Component Editor](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeditorOverview.htm)

[Records - Overview](RecordsEnglishUS.chm::/RC_overview.htm)

[Implementations](INT_Overview_Implementations.md)

[Rescalable Implementations](INT_RescalableImplementations.md)
