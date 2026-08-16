# Element Editor Configuration and Properties

These pages focus on property surfaces, configuration fields, and UI reference areas.

- [Properties Editor](../raw/EEd_Overview.md)
  Context: `Properties Editor`
  Note: Elements are signature elements, variables, tables, arrays and complex elements (referenced components).
- [Instances and Occurrences](../raw/EEd_instances_occurrences.md)
  Context: `Properties Editor > Basics > Instances and Occurrences`
  Note: An element can have several occurrences. An occurrence of an element is the equivalent to writing down the name of the element in a text-based programming language. Changes in one occurrence of an element affect all the other occurrences of that same element.
- [Element Configuration](../raw/EEd_element_configuration.md)
  Context: `Properties Editor > Basics > Element Configuration`
  Note: An element configuration is edited in the properties editor. The properties editor can be called from any specification editor and from the Component Manager.
- [Imported Elements](../raw/EEd_ImportedElements.md)
  Context: `Properties Editor > Basics > Imported Elements`
  Note: A module Module_imported contains an imported global variable. Without project context, the variable is represented as follows.
- [Dependent Elements](../raw/EEd_dependent_elements.md)
  Context: `Properties Editor > Basics > Dependent Elements`
  Note: Parameters can be specified as dependent parameters. This means that they derive their value from another element.
- [Calibration Access](../raw/eed_calibrationaccess.md)
  Context: `Properties Editor > Basics > Calibration Access`
  Note: Beginning with V6.2, ASCET allows a three-step configuration of calibration access to elements. In non-AUTOSAR projects, information on calibration access is required for the ASAM-MCD-2MC (*.a2l) generation. In AUTOSAR projects, this information is required for the generation of the AUTOSAR descriptions (*.arxml files).
- [Opening the Properties Editor](../raw/EEd_open_element_editor.md)
  Context: `Properties Editor > Instructions > Opening the Properties Editor`
  Note: To open the properties editor, proceed as follows:
- [Editing the Configuration of a Scalar Element](../raw/EEd_edit_element_configuration.md)
  Context: `Properties Editor > Instructions > Editing the Configuration of a Scalar Element`
  Note: To configure a scalar element as you wish, proceed as follows:
- [Editing the Configuration of a Composite Element](../raw/eed_editconfiguration_compositeelement.md)
  Context: `Properties Editor > Instructions > Editing the Configuration of a Composite Element`
  Note: This instruction does not explain how to create an array or matrix with variable size. If you want to know how to do that, see Specifying an Array or Matrix with Variable Size.
- [Specifying an Array or Matrix with Variable Size](../raw/Eed_SpecifyArrayMatrix_VariableSize.md)
  Context: `Properties Editor > Instructions > Specifying an Array or Matrix with Variable Size`
  Note: Only arrays/matrices of kind variable and specified as explicit references can have variable sizes. Arrays and matrices used as messages cannot have variable sizes.
- [Editing the Configuration of a Complex Element](../raw/eed_editconfiguration_complexelement.md)
  Context: `Properties Editor > Instructions > Editing the Configuration of a Complex Element`
  Note: To configure a complex element, proceed as follows:
- [Editing the Element Scope](../raw/EEd_EditElementScope.md)
  Context: `Properties Editor > Instructions > Editing the Element Scope`
  Note: To edit the scope of an element, proceed as follows.
- [Editing the Calibration Access](../raw/EEd_EditCalibrationAccess.md)
  Context: `Properties Editor > Instructions > Editing the Calibration Access`
  Note: To edit the scope of an element, proceed as follows.
- [Enabling or Disabling Elements](../raw/EEd_enable_diabale_elements.md)
  Context: `Properties Editor > Instructions > Enabling or Disabling Elements`
  Note: It is possible to enable individual elements within a component. Enabling an element means that the element can be accessed from outside of the current component. Parameters and constants can be read out from the current component. Variables, however, can be read in and out.
- [Specifying a Reference](../raw/EEd_Specifying_a_Reference.md)
  Context: `Properties Editor > Instructions > Specifying a Reference`
  Note: To specify a non-scalar element as explicit reference, proceed as follows.
- [Creating the Formula for Dependent Parameters](../raw/EEd_create_fromula_dependent.md)
  Context: `Properties Editor > Instructions > Creating the Formula for Dependent Parameters`
  Note: To create the formula for dependent parameters, proceed as follows:
- [Editing the Formula of a Dependent Parameter](../raw/EEd_edit_formula_dependent.md)
  Context: `Properties Editor > Instructions > Editing the Formula of a Dependent Parameter`
  Note: You can edit the formula of a dependent parameter at a later state.
- [Editing Dependent Parameters](../../data-editor/raw/DEd_Editing_Dependent_Parameters.md)
  Context: `Properties Editor > Instructions > Editing Dependent Parameters`
- [Using Temporary Variables](../raw/EEd_use_temporary_variables.md)
  Context: `Properties Editor > Instructions > Using Temporary Variables`
  Note: Temporary variables are deprecated; they will be removed in a future ASCET version.
- [Reference to User Interface](../raw/EEd_Reference_to_User_Interface.md)
  Context: `Properties Editor > Reference to User Interface`
  Note: The following variants of the properties editor are available:
- [Properties Editor for Basic Elements](../raw/EED_Element_Editor_Basic_Elements.md)
  Context: `Properties Editor > Reference to User Interface > Properties Editor for Basic Elements`
  Note: This field contains the element name.
- [Properties Editor for Interrunnable Variables](../raw/eed_for_interrunnablevariables.md)
  Context: `Properties Editor > Reference to User Interface > Properties Editor for Interrunnable Variables`
  Note: Inserts the default minimum value for the selected type.
- [Properties Editor for CT Block Elements](../raw/EEd_Element_Editor_CT_Block_Elements.md)
  Context: `Properties Editor > Reference to User Interface > Properties Editor for CT Block Elements`
  Note: Inserts the default minimum value for the selected type.
- [Properties Editor for Included Components](../raw/EEd_Element_Editor_Included_Component.md)
  Context: `Properties Editor > Reference to User Interface > Properties Editor for Included Components`
  Note: This window contains the following editable elements.
- [Properties Editor for Implementation Casts, Record Elements and Mode Groups](../raw/EEd_PropertiesEditor_ModeGroups.md)
  Context: `Properties Editor > Reference to User Interface > Properties Editor for Implementation Casts, Record Elements and Mode Groups`
  Note: Inserts the default minimum value for the selected type.
- [Formula Editor for Dependent Parameters](../raw/EEd_Formula_Editor_Dependent_Parameters.md)
  Context: `Properties Editor > Reference to User Interface > Formula Editor for Dependent Parameters`
  Note: [image]
