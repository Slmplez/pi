# Records in ESDL

In ESDL, record elements can be accessed directly, e.g.,

myRecord.y = myRecord.x

Individual elements of included records can be accessed the same way, provided the ports are enabled (for restrictions, see [Allowed Content](RC_Allowed_Content.md)). It is not allowed, however, to use the Set port of the included record itself.

An example:

The record InnerRecord is defined as follows:

record type InnerRecord {

cont x;

cont y;

}

The record OuterRecord contains a continuous variable x and the record InnerRecord. It is defined as follows:

record type OuterRecord {

cont x;

record InnerRecord I;

}

Statements of the following kind are allowed:

OuterRecord.x = OuterRecord.I.x;

OuterRecord.I.y = myValue;

See also

[Allowed Content](RC_Allowed_Content.md)

[Records in Block Diagrams](RC_Records_in_Block_Diagrams.md)
