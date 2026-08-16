# Specifying a Reference

To specify a non-scalar element as explicit reference, proceed as follows.

Arrays, matrices and records used as messages must not be specified as explicit references. If they are, an error (MMdl794) is issued during code generation: Element <name> is a message and a reference, but the combination is not allowed.

1. In the specification editor, select the non-scalar element you want to use as explicit reference.
1. [Open the properties editor](EEd_open_element_editor.md) for the element.
1. In the properties editor, activate the Reference option in the Attributes area.
1. Activate the necessary access options in the Internal Access field.
1. Activate the necessary access options in the External Access field.
1. Close the properties editor.
1. Initialize the reference via one of the following possibilities:
1. [Edit the reference implementation.](../../implementation-editor/raw/IED_ImplementingReferences.md)

See also

[Opening the Properties Editor](EEd_open_element_editor.md)

[Mapping a Reference](../../data-editor/raw/DEd_MappingReference.md)

[Using References Without Initialization](IntroductionEnglishUS.chm::/INT_UseReferencesWithoutInit.htm)

[Implementing References](../../implementation-editor/raw/IED_ImplementingReferences.md)

[Explicit References](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm)
