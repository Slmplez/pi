# Records in Block Diagrams

When a record is inserted into a block diagram, it is displayed like other included components. By default, Get and Set ports <!-- kadovTextPopupInit('a2'); //--><!-- kadovTextPopupInit('a1'); //-->for the elements in the record are shown. If the record contains another record, Get and Set ports are shown for all elements in the nested record, as well as for the nested record itself.

You can edit the record layout in the [layout editor](LayoutEditorEnglishUS.chm::/LEd_Overview.htm). There, you can show or hide individual record ports.

Write access via a Set port requires a [sequence call](BlockDiagramEditorEnglishUS.chm::/BDE_SequenceCalls.htm).

An example:

The record InnerRecord is defined as follows:

record type InnerRecord {

cont x;

cont y;

cont array[4];

cont matrix[4][4];

}

The record OuterRecord contains a continuous variable x and the record InnerRecord. It is defined as follows:

record type OuterRecord {

cont x;

record InnerRecord I;

}

Included in a block diagram, OuterRecord looks as follows:

![](images/layout_outerRecord.gif)

See also

[Allowed Content](RC_Allowed_Content.md)

[Records in ESDL](RC_Records_in_ESDL_CCode.md)

[Layout Editor - Overview](LayoutEditorEnglishUS.chm::/LEd_Overview.htm)

[Sequence Calls](BlockDiagramEditorEnglishUS.chm::/BDE_SequenceCalls.htm)
