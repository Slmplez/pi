# Externally Declared Records

You can mark a record as "declared externally" (see [Editing a Record Implementation](RC_Edit_RecordImplementation.md)). The following rules apply to externally declared records in an ASCET model:

- If the record implementation is set to Generate struct, and the record does not contain any elements, an error (MMdl50) is issued during code generation.
- If the record implementation is set to Use external struct or Use external typedef, and the record does not contain any elements, an error (MMdl501) is issued during code generation for each instance of the record (but not for a reference, method argument or return).
- If a record with activated Use external struct or Use external typedef includes a record with Generate struct (i.e. a record that is declared by ASCET), an error (MMdl502) is issued during code generation.
- If the record implementation is set to Use external struct or Use external typedef, and the order of record elements is not user-defined, an error (MMdl510) is issued during code generation.
- If the record implementation is NOT set to Generate struct and

- the record is used in an AUTOSAR context,

or

- the record is used in an EHOOKS context,

an error (MMdl503) is issued during code generation.

##### ASCET-SE features:

- If Generate struct is activated, a header file that contains the structure definition for the record is generated.
- If Use external struct or Use external typedef is activated, no header file is generated for the record.
- The name of the struct is set to the name specified in the [External Struct tab](ImplementationEditorEnglishUS.chm::/IEd_ExternalStruct_Tab.htm) of the record implementation editor.

If no name is specified, the name template in the [target settings](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm) of the respective target is used.

##### Experiments:

- A record with activated Use external struct or Use external typedef can only be used in an experiment if it contains only scalar elements. For records that include arrays, matrices or other records, an error (MMdl6421) is issued.

See also

[Editing a Record Implementation](RC_Edit_RecordImplementation.md)

[External Struct Tab](ImplementationEditorEnglishUS.chm::/IEd_ExternalStruct_Tab.htm)

[ASCET Options Window - Targets Node](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm)
