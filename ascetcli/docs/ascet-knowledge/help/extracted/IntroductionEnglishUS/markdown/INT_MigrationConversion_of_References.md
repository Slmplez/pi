# Migration and Conversion of References

When existing databases are opened with the current ASCET version, or when existing export files (*.exp, *.amd, *.axl) are imported, the Reference option (see [Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)) is deactivated for all elements.

A fully automated conversion from implicit to explicit references is not possible, due to the following reasons:

- In previous ASCET versions, the implementation editor of C code components allowed to set a reference flag for non-scalar elements. This old reference flag was bound to a particular implementation of the component, whereas the new explicit references are bound to the element instance. This difference cannot be solved automatically.
- Explicit references must be mapped to a non-reference element which ensures initialization of the reference. This mapping has to be done manually by the user (see [Mapping a Reference](DataEditorEnglishUS.chm::/DEd_MappingReference.htm)).

Code generation detects inconsistent settings of the reference flag. If elements not specified as explicit references are used as implicit references, a warning is reported in the ASCET monitor window. By double-clicking the warning, you are lead to the inconsistent elements; open the properties editor and set the reference flag (see [Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)).

C Code components keep their current reference flag within the implementation configuration. This flag will be valid as long as the element is not specified as explicit reference. If the element is marked as explicit reference, the old implementation-related flags are overruled and the element is handled as a reference in all implementations.

See also

[Explicit References](INT_ExplicitReferences.md)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Mapping a Reference](DataEditorEnglishUS.chm::/DEd_MappingReference.htm)

[Overview - Properties Editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm)
