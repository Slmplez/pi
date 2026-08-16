# Components with Rescalable Elements

For each instance of a component, a rescaling formula can be selected in the implementation editor of the parent component or project. A formula used as rescaling formula must be linear with zero offset and positive scale.

If the component contains basic elements (scalar elements, arrays, matrices) with a rescalable implementation, errors are issued in the following cases:

- No rescaling formula is selected (error code MMdl47).
- A rescaling formula is selected, but that formula is non-linear (error code MLm901) or linear with non-zero offset (error code MLm902) and/or negative scale (error code MLm903).

If the component does not contain basic elements with a rescalable implementation, and a rescaling formula is specified, a warning (code WMdl47) is generated that the rescaling formula is ignored.

The arithmetic operations for rescalable elements are restricted, see [Operations with Rescalable Elements](INT_OperationsRescalableElements.md).

The formula of a rescalable element that is accessible from outside the owning component (method argument or method return) is not rescalable for executable bodies outside the component. The formula has the scale of the element multiplied with the scale of the rescaling formula on the component instance implementation.

See also

[Elements with Rescalable Implementation](INT_ElementsRescalableImpl.md)

[Operations with Rescalable Elements](INT_OperationsRescalableElements.md)

[Integer Arithmetic with Rescalable Elements](Int_IntegerArithmetic_RescalableElements.md)

[Specifying Rescalable Implementations](ImplementationEditorEnglishUS.chm::/Ied_SpecifyRescalableImplementations.htm)

[Project Editor - Transformation Formulas](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm)

[Implementation Editor for Components/Projects](ImplementationEditorEnglishUS.chm::/IEd_ImplementationEditor_for_ComponentsProjects.htm)
