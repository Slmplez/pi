# Explicit References

In ASCET versions prior to V6.0, the fact whether a reference type element is a reference or not is, in most cases, implicitly derived from its usage in the model: If an element has a connected set port, it is assumed to be used as reference. This occasionally lead to unexpected and unpredictable behavior; to avoid this, explicit references were introduced.

Implicit reference are no longer created if something is assigned to a reference type elements. The following happens instead:

- An assignment to an array, matrix or record instance is allowed if the types are compatible. In such a case, the complete content of the array/matrix/record is copied, using the copy function specified in the [target settings](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm).
- An assignment to a complex element is forbidden; in such a case, an error (MMdl3) is issued.

The following non-scalar variables of a component (class, module, state machine, SWC) or project can be specified as explicit reference in the [properties editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm).

- array
- matrix
- normal or fixed characteristic line/map
- normal class
- state machine
- Boolean table
- conditional table
- record

Arrays, matrices and records used as messages must not be specified as explicit references. If they are, an error (MMdl794) is issued during code generation: Element <name> is a message and a reference, but the combination is not allowed.

Non-scalar variables not listed here cannot be specified as explicit reference. Elements in Boolean tables, conditional tables, CT blocks, records and AUTOSAR interfaces cannot be specified as explicit reference, either.

The access possibilities for references can be specified in the properties editor, too. For explicit references in classes and modules, you can specify external and internal access; for explicit references in AUTOSAR software components and projects, you can specify only internal access. Available settings are:

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">external access</p></td>
<td class="hcp3">
<p class="tabledefaulteng">Set() Method</p></td>
<td class="hcp3">
<p class="tabledefaulteng">The explicit reference can be set to another data 
 structure by other components.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">Get() Method</p></td>
<td class="hcp3">
<p class="tabledefaulteng">The explicit reference can be used by other components.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">internal access</p></td>
<td class="hcp3">
<p class="tabledefaulteng">Write for referenced element</p></td>
<td class="hcp3">
<p class="tabledefaulteng">The referenced element can be written from inside 
 the component.</p>
<p class="note">If write access is enabled, the reference cannot be mapped 
 to a parameter because parameters cannot be written.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">Read for referenced element</p></td>
<td class="hcp3">
<p class="tabledefaulteng">The referenced element can be read from inside 
 the component.</p></td></tr>
</table>

Explicit references are marked by an additional symbol, on top of the symbol denoting kind and scope.

| Column 1 | Column 2 |
| --- | --- |
| local reference |  |
| exported reference |  |
| imported reference |  |

Explicit references must be initialized, see [Initialization of Explicit References](INT_InitExplicitReferences.md).

In an experiment, explicit references cannot be measured or calibrated.

See also

[Initialization of Explicit References](INT_InitExplicitReferences.md)

[Value Types and Reference Types](INT_ValueTypes_ReferenceTypes.md)

[Migration and Conversion of References](INT_MigrationConversion_of_References.md)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Mapping a Reference](DataEditorEnglishUS.chm::/DEd_MappingReference.htm)

[Implementing References](ImplementationEditorEnglishUS.chm::/IED_ImplementingReferences.htm)

[Component Manager - Promoting Information and Warnings](ComponentManagerEnglishUS.chm::/Promoting_Information_and_Warnings.htm)

[ASCET Options Window - Targets Node](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm)

[Overview - Properties Editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm)

[Messages](INT_messages.md)
