# Elements with Rescalable Implementation

Only certain elements can have rescalable implementations; see the following list. Elements with rescalable implementation are called rescalable elements.

- scalar variables, parameters and system constants
- arrays and matrices
- arguments, local variables and return values of methods
- local variables of processes and runnable entities

The implementation editor of an element can be used to mark the element as rescalable. The following restrictions apply:

- Code generation accepts only elements of type cont with activated Rescalable option .

Elements of type sdisc or udisc with activated Rescalable option produce errors (code MIa50).

- The element scope must be local.

The element scope exported or imported causes an error (code MIa51).

- An element with activated Rescalable option must use a linear formula with an offset of 0.

A non-linear formula, or a linear formula with non-zero offset, causes an error (code MIa52).

- An element with activated Rescalable option must use an integer type as implementation data type.

If the implementation data type is real*, an error (code MIa53) is issued.

- The element implementation must use the implementation page as master (see [Setting the Master Page of an Implementation](ImplementationEditorEnglishUS.chm::/set_masterpg_impl.htm)).

If the master page is set to Model, an error (code MIa54) is issued.

- Characteristic lines and maps and distributions must not be marked as rescalable.

If the values, x- or y-distribution are marked as rescalable, an error (code MIa501) is issued.

- The initial value of a rescalable element must be 0.

A non-zero initial value produces an error (code MMdl46).

- Interrunnable variables and elements in AUTOSAR interfaces must not be marked as rescalable.

If such an element is marked as rescalable, an error (code MIa55) is issued.

See also

[Operations with Rescalable Elements](INT_OperationsRescalableElements.md)

[Components with Rescalable Elements](int_componentsrescalableelements.md)

[Specifying Rescalable Implementations](ImplementationEditorEnglishUS.chm::/Ied_SpecifyRescalableImplementations.htm)

[Implementation Editor for Scalar Elements, Arrays and Matrices](ImplementationEditorEnglishUS.chm::/IEd_Impl_Editor_for_Scalar_Nonlogical_Elements.htm)

[Project Editor - Transformation Formulas](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm)
