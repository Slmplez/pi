# Implementation Data Type Bool

ASCET introduces a new implementation data type, Bool, for logical elements. With that, ASCET can properly handle the Boolean type defined by AUTOSAR.

If used outside the AUTOSAR context, the implementation data type Bool is treated the same way as implementation type uint8 for simulation targets (i.e. PC, ES113x, ES910, Prototyping). For ASCET-SE targets, a suitable base type definition is available.

If the Bit implementation data type is used within an AUTOSAR context, a warning is issued during code generation, and Bit is replaced by Bool for method arguments, return values, method-local variables and all data elements of SenderReceiver and NVData interfaces.

See also

[Editing Implementations - Specifying the Implementation for a Logical Element](ImplementationEditorEnglishUS.chm::/specify_impl-logicalelement.htm)
