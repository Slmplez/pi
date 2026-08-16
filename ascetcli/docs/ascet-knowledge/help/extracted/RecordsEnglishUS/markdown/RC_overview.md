# Records - Overview

ASCET provides the possibility to specify records as user-defined composite data types.

All elements in a record are placed in the same memory class (i.e. the record is generated as C struct), in consecutive bytes in a coherent memory area. The record elements inherit the memory class from the instance of the record. By sorting the record elements in the record implementation editor, the record layout in the memory can be determined on the byte level.

By default, ASCET generates a struct declaration for each record. In addition, you can mark a record as "declared externally" and use an externally declared record in your ASCET model.

In the AUTOSAR context, records can be used to model AUTOSAR data element prototypes of SenderReceiver and NVData interfaces or operation arguments of client-server interfaces.

In a non-AUTOSAR context, records are used to group related data.

Unlike classes, records have neither diagrams nor methods.

See also

[Allowed Content](RC_Allowed_Content.md)

[Records in Block Diagrams](RC_Records_in_Block_Diagrams.md)

[Records in ESDL](RC_Records_in_ESDL_CCode.md)

[Externally Declared Records](RC_ExternallyDeclaredRecords.md)

You can

[Create a Record](RC_Creating_a_Record.md)

[Specify a Record](RC_Specifying_a_Record.md)

[Edit a Record Implementation](RC_Edit_RecordImplementation.md)
