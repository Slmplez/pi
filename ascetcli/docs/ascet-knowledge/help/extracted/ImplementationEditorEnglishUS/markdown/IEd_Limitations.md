# Limitations

A calculation might result in values outside the interval limits for a variable. The limiter takes into account the interval limits of a variable for all assignments to this variable, i.e. the code generator creates a limiting code. The limits obviate the need for manual limitation of individual variable values.

The default of this option named Limit Assignments, i.e. the setting that applies to newly created elements, can be set, separately for elements of the model data types cont, sdisc and udisc, in the Implementation node of the ASCET Options window. If the implementation data type real64 or real32 is selected for an element of model data type cont, the Limit Assignments option cannot be edited.

Instead of the Limit Assignments option, the implementation editor of ASCET versions older than V5.0 contained the Use Limiters field with the options Yes and No. If you are working with very old models, Limit Assignments is set according to the settings in that field.

When working with models from ASCET versions older than V5.0, Limit to maximum bit length is set according to the former Use Limiters field. Automatic is selected for all elements. The handling of operator implementations from previous ASCET versions is described in [Operator Implementation](operator_impl.md).

See also

[Setting the Limitation](set_limitation.md)

[Editing an Element Configuration](ElementEditorEnglishUS.chm::/EEd_edit_element_configuration.htm)

[ASCET Options Window - Implementation Options](ComponentManagerEnglishUS.chm::/cm_implementation_node.htm)

[Operator Implementation](operator_impl.md)

[Setting the Overflow Handling](set_overflow_handling.md)
