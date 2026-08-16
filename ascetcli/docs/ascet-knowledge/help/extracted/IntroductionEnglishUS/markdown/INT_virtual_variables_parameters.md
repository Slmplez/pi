# Virtual Variables/Parameters

Virtual variables/parameters are only available in the specification platform, they bear no relevance for code generation. They are included for a better understanding of the significance of model elements in the specification.

Virtual variables always depend on other virtual or non-virtual variables. Virtual variables are merely aliases to non-virtual variables. No mathematical dependencies such as formulas are allowed, thus the identity (var_virtual = var_real) is predefined for editing the data of virtual variables.

On the other hand, parameters declared as virtual are not necessarily dependent on other parameters.

Beginning with ASCET V6.2, it is no longer possible to assign the attributes "virtual" and "non-volatile" to the same variable. A virtual variable is automatically set to "volatile". If you use an existing component that contains a variable with the "virtual" and "non-volatile" attributes, a warning is issued during code generation:

WMdl400 - Element "%1" has both attributes >non volatile< and >virtual< set. This is not allowed anymore, please change settings manually.

See also

[Variables](INT_variables.md)

[Parameters](INT_parameters.md)

[Editing the Configuration of a Scalar Element](ElementEditorEnglishUS.chm::/EEd_edit_element_configuration.htm)

[Editing the Configuration of a Composite Element](ElementEditorEnglishUS.chm::/eed_editconfiguration_compositeelement.htm)

[Editing the Configuration of a Complex Element](elementeditorenglishus.chm::/eed_editconfiguration_complexelement.htm)
