# Redundant Data Storage

In the AUTOSAR world, multiple SWC from multiple sources are integrated into one ECU. Due to a missing memory protection (the ECU memory management cannot isolate these SWC from each other), there is a potential risk that one faulty SWC may corrupt the data of other SWC in memory.

ASCET offers a possibility for critical data to detect invalid data during program execution: Redundant data storage. Redundant data storage means that selected data can be stored in two different places in the memory (the original representation and its complement), and the two values can be compared at a later time. If the original value and its complement are not consistent, error actions can be taken.

The following conditions must be met for redundant data storage of an element:

- the element is of scalar, enumeration, array, or matrix type
- the element belongs to one of the following components:
- an SWC
- a class or module specified as block diagram or ESDL
- an ActionCondition diagram in a state machine

- the element is of the [kind](INT_summaryke.md) Variable or Message
- the element is of [scope](INT_the_scope_of_elements.md) Local or Exported
- the element is volatile

For all other elements (e.g., elements with bit implementation, parameters, complex elements, elements in records or AUTOSAR interfaces, etc.), redundant data storage must not be activated. If it is, an error message is issued during code generation:

MMdl37 - redundant data flag is set for <element>, but <reason for error>

In the context of a project, redundant data storage can be activated or deactivated via the [Use Redundant Data Storage](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) option.

For an individual element, redundant data storage is activated via the Redundant option in the Attribute area of the [properties editor](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm). An element's Redundant option has no effect when redundant data storage is deactivated for the project.

When redundant data storage is activated, each write access to an element marked as redundant stores the value in both the original and the complement representation. The memory section of the complement representation is specified in the memorySections.xml file; see [Memory Classes for Redundant Data Storage](INT_MemoryClasses_RedundantDataStorage.md).

The Verify operator (block diagrams) or the verify() operation (ESDL) can be used to check consistency of an element's original value and its complement. You have to specify each check manually; see [Using the Verify Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseVerifyOperator.htm) and [Verify Operation](ESDLEditorEnglishUS.chm::/ESDL_VerifyOperator.htm) for details.

When you calibrate an element marked as redundant in an experiment, or stimulate the element during an offline simulation, only the original value is changed. The complement representation is not changed, and the result of a verify operation will be false.

See also

[Code Generation with Redundant Data Storage](INT_CodeGen_RedundantDataStorage.md)

[Complement Service for Redundant Data Storage](INT_ComplementService_RDS.md)

[Memory Classes for Redundant Data Storage](INT_MemoryClasses_RedundantDataStorage.md)

[Block Diagram Editor - Using the Verify Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseVerifyOperator.htm)

[ESDL Editor - Verify Operation](ESDLEditorEnglishUS.chm::/ESDL_VerifyOperator.htm)

[Implementations](INT_Overview_Implementations.md)

[The Kind of Elements](INT_summaryke.md)

[The Scope of Elements](INT_the_scope_of_elements.md)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)

[Properties Editor for Basic Elements](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm)
