# Data Type Names

ASCET uses the following data types and data type names.

| Column 1 | Column 2 |
| --- | --- |
| data type | default data type name |
| Bit | bit |
| Bool | bool |
| Unsigned Integer 8 | uint8 |
| Signed Integer 8 | int8 |
| Unsigned Integer 16 | uint16 |
| Signed Integer 16 | int16 |
| Unsigned Integer 32 | uint32 |
| Signed Integer 32 | int32 |
| Real 32 | real32 |
| Real 64 | real64 |

ASCET allows the customization of data type names (see [Customizing Data Type Names](ComponentManagerEnglishUS.chm::/CM_CustomizeDataTypeNames.htm)); you can, e.g., use the name unsigned8 instead of uint8. The customized names are used in the ASCET user interface (implementation editor for scalar elements, Implementation tab, etc.) and in the code generated for ASCET-SE targets. Code generated for experimental targets (RP targets, PC target, Prototyping target) uses the default data type names.

The semantics of data types (dimension, etc.) is not changed, and new data types cannot be added, by customizing data type names.

In addition to the customization in ASCET, user-defined C type definitions must be made available to all source files generated for ASCET-SE targets. For this purpose, an empty header file named a_user_def.h is provided in the <install_dir>\target\trg_<targetname>\include directory of each ASCET-SE target. This header file must be adapted for the customized data type names; the data type names that differ from the default names must be defined. a_user_def.h is included in the generated files automatically.

The definition of the type must be sufficiently wide that it can hold all values of the ASCET data type. For example, an unsigned 16 bit integer must be mapped to a type name that is at least 16 bits wide.

IMPORTANT: ASCET does not check whether the customized data types defined in a_user_def.h are sufficiently wide. Your application may not function correctly if this property is not verified as part of the development process.

See also

[Example: a_user_def.h](INT_Example_a_user_def.h.md)

[Component Manager - Customizing Data Type Names](ComponentManagerEnglishUS.chm::/CM_CustomizeDataTypeNames.htm)
