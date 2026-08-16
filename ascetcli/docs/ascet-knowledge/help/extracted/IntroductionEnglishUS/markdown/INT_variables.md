# Variables

Variables store values that can be read and written from inside the model, i.e. a read and a write operation can be performed on them.

In the ECU, they can be placed in the volatile or non-volatile memory. For newly created variables, volatile is pre-selected.

Variables can be real or virtual (see [Virtual Variables/Parameters](INT_virtual_variables_parameters.md)).

Beginning with ASCET V6.2, it is no longer possible to assign the attributes "virtual" and "non-volatile" to the same variable. A non-volatile variable is automatically set to "non-virtual". If you use an existing component that contains a variable with the "virtual" and "non-volatile" attributes, a warning is issued during code generation:

WMdl400 - Element "%1" has both attributes >non volatile< and >virtual< set. This is not allowed anymore, please change settings manually.

See also

[Virtual Variables/Parameters](INT_virtual_variables_parameters.md)

[Editing the Configuration of a Scalar Element](ElementEditorEnglishUS.chm::/EEd_edit_element_configuration.htm)

[Editing the Configuration of a Composite Element](ElementEditorEnglishUS.chm::/eed_editconfiguration_compositeelement.htm)

[Editing the Configuration of a Complex Element](elementeditorenglishus.chm::/eed_editconfiguration_complexelement.htm)
