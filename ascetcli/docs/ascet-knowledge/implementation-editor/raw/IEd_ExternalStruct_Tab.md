# External Struct Tab

The External Struct tab is only available for records. It contains the following elements:

##### Generate struct

If activated (default), the code generation generates a struct declaration for the record.

##### Use external struct

If activated, an external struct declaration is used for the record.

##### Use external typedef

If activated, an external typedef declaration is used for the record.

##### Production code only

Only available if Use external * is activated.

If activated, the external struct or typedef declaration is used only for production code.

##### Struct name

The name of the external struct or typedef declaration. If no name is defined (default), the standard name template is used.

Records with activated Use external * option in AMD/AXL format can only be exported with AMD format V6.4.* or higher. AMD format version V6.3.0 or lower will produce an error.

See also

[Externally Declared Records](RecordsEnglishUS.chm::/RC_ExternallyDeclaredRecords.htm)
