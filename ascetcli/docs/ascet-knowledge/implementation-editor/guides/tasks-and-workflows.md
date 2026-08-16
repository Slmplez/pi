# Implementation Editor Tasks and Workflows

These pages focus on actions, editing flows, and step-by-step tasks.

- [Overview](../raw/IEd_Overview.md)
  Context: `Editing Implementations > Overview`
  Note: Several implementation editors are available for components and projects, basic elements - i.e. variables, parameters, and system constants – and methods, processes, and runnable entities. Depending on the kind of the elements, fields are deactivated, or additional tabs appear, in the implementation editor for basic elements, however, the structure is always the same.
- [Implementations of Components/Projects](../raw/IEd_impl_comp_proj_s.md)
  Context: `Editing Implementations > Basics > Implementations of Components/Projects`
  Note: You can open the implementation editor for components/projects
- [Implementation of Scalar, Non-logical Elements](../raw/impl_scalar_nonlogical.md)
  Context: `Editing Implementations > Basics > Implementation of Scalar, Non-logical Elements`
  Note: The implementation of non-logical elements describes the transformation from an infinite model domain (either continuous or discrete) to a finite implementation domain. Therefore the range for the values in the model has to have interval limits. Additionally, a linear formula describing the transformation from the physical to the implemented representation has to be defined.
- [Implementations of Implementation Casts](../raw/impl_impl_casts.md)
  Context: `Editing Implementations > Basics > Implementations of Implementation Casts`
  Note: Implementation casts can be implemented the same way as scalar elements. The only new thing is the possibility not to implement them at all by selecting <No implementation> in the Implementation Type combo box. <No implementation> is the default selection for newly created implementation casts.
- [Implementations of Arrays, Matrices and Characteristic Lines/Maps](../raw/IEd_impl_arrays_matrices_tables.md)
  Context: `Editing Implementations > Basics > Implementations of Arrays, Matrices and Characteristic Lines/Maps`
  Note: Arrays and matrices have implementations which are defined like that of a scalar element. A characteristic line (1-D table) has two implementations, one for the X sample points and one for the output value. A characteristic map (2-D table) has three implementations, two for the X and Y sample points and one for the output value.
- [Method/Process/Runnable Implementations](../raw/method_process_impl.md)
  Context: `Editing Implementations > Basics > Method/Process/Runnable Implementations`
  Note: In ASCET, it is possible to have implementations not only for elements and components, but also for the methods, processes and runnables defined in modules, classes and software components. With that, you can improve the overall behavior of your system.
- [Implementations of Arguments and Return Values of Methods](../raw/IEd_Impl_Argu_ReturnValues_of_Methods.md)
  Context: `Editing Implementations > Basics > Implementations of Arguments and Return Values of Methods`
  Note: The arguments and return value of a method are implemented exactly as other elements of the same type (see Implementations of Components/Projects, Implementation of Scalar, Non-logical Elements, Implementations of Arrays, Matrices and Tables, Specifying an Implementation for a Logical Element and Specifying an Enumeration Implementation).
- [Implementations of Method-/Process-/Runnable-Local Variables](../raw/impl_method_process.md)
  Context: `Editing Implementations > Basics > Implementations of Method-/Process-/Runnable-Local Variables`
  Note: Method-, process- and runnable-local variables can be implemented automatically or explicitly. With automatic implementation, the implementation is derived from the first variable assigned to the method-/process-local variable.
- [Implementations for Temporary Variables](../raw/impl_temporary_variables.md)
  Context: `Editing Implementations > Basics > Implementations for Temporary Variables`
  Note: Temporary variables in block diagrams are deprecated; they will be removed in a future ASCET version.
- [Formulas](../raw/IEd_Formulas.md)
  Context: `Editing Implementations > Basics > Implementation Components > Formulas`
  Note: ASCET supports transformation formulas to define the implementation for fixed-point arithmetic. The identity formula is present in each project, other formulas have to be defined in the project editor of the associated project.
- [Examples: Rules for Formulas](../raw/IEd_Examples_RulesFormulas.md)
  Context: `Editing Implementations > Basics > Implementation Components > Examples: Rules for Formulas`
  Note: [image]
- [Master Page](../raw/Master_Page.md)
  Context: `Editing Implementations > Basics > Implementation Components > Master Page`
  Note: ASCET can either use the model or the implementation page of an implementation as the starting point for automatic updates. The starting point is set with the options in the Master field. You can set the default master page in the Implementation node of the ASCET options window.
- [Consistency Checks](../raw/IEd_Consistency_Checks.md)
  Context: `Editing Implementations > Basics > Implementation Components > Consistency Checks`
  Note: The values inserted for the model or implementation are checked for consistency, together with the formula. The actions taken due to the results of the checks depend on the Automatically select the Implementation Type option (in the Implementation node of the ASCET options window).
- [Limitations](../raw/IEd_Limitations.md)
  Context: `Editing Implementations > Basics > Implementation Components > Limitations`
  Note: A calculation might result in values outside the interval limits for a variable. The limiter takes into account the interval limits of a variable for all assignments to this variable, i.e. the code generator creates a limiting code. The limits obviate the need for manual limitation of individual variable values.
- [Protection Against Division by Zero](../raw/Excluding_Zero.md)
  Context: `Editing Implementations > Basics > Protection Against Division by Zero`
  Note: The code generation assumes that the implementation interval can include zero. It is checked whether the denominator of a division contains zero. You can switch off the check in the Project Properties window, Code Generation node, Protected against Division by Zero option. In that case, the code generator takes the interval into account, e.g. a division by [0..100] is not protected.
- [Using Implementation Types](../raw/using_impl_types.md)
  Context: `Editing Implementations > Basics > Using Implementation Types`
  Note: Instead of the individual implementation, you can also assign a predefined implementation type. For details on how to create this, refer to Implementation Types.
- [Operator Implementations](../raw/operator_impl.md)
  Context: `Editing Implementations > Basics > Operator Implementations`
  Note: In old ASCET versions (i.e. V4.2 or older), operators in block diagrams could be implemented, too.
- [Automatic Conversion of Operator Implementations](../raw/automatic_conversion_op_impl.md)
  Context: `Editing Implementations > Basics > Operator Implementations > Automatic Conversion of Operator Implementations`
  Note: You can delete operator implementations in old models (see Removing an Individual Operator Implementation) or replace them automatically with implementation casts. Automatic replacing applies to the entire database, not to individual components.
- [Implementing Components](../raw/IED_ImplementationComponents.md)
  Context: `Editing Implementations > Instructions > Implementing Components`
  Note: Implementing components and projects contains the following steps.
- [Opening the Implementation Editor of an Edited Component/Project](../raw/IEd_open_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Opening the Implementation Editor of an Edited Component/Project`
  Note: To open the implementation editor of an edited component/project, proceed as follows:
- [Opening the Implementation Editor of an Included Component (A)](../raw/IEd_open_impleditor_includedcomponent.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Opening the Implementation Editor of an Included Component (A)`
  Note: To open the implementation editor of an included component from the specification editor of the parent component, proceed as follows:
- [Opening the Implementation Editor of an Included Component (B)](../raw/open_incld_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Opening the Implementation Editor of an Included Component (B)`
  Note: To open the implementation editor of an included component from the implementation editor of the parent component, proceed as follows:
- [Selecting an Implementation](../raw/IEd_select_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Selecting an Implementation`
  Note: To select an implementation, proceed as follows:
- [Creating or Copying an Implementation](../raw/ied_create_copy_implementation.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Creating or Copying an Implementation`
  Note: To create/copy an implementation, proceed as follows:
- [Selecting a Default Implementation](../raw/IEd_Select_DefaultImplementation.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Selecting a Default Implementation`
  Note: To make an implementation the default, proceed as follows:
- [Adjusting the Implementation Settings](../raw/adjust_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Adjusting the Implementation Settings`
  Note: To adjust the implementation settings, proceed as follows:
- [Deleting an Implementation](../raw/IEd_Deleting_Implementation.md)
  Context: `Editing Implementations > Instructions > Implementing Components > Deleting an Implementation`
  Note: To delete a data set, proceed as follows:
- [Implementing Records](../raw/IEd_Implementing_Records.md)
  Context: `Editing Implementations > Instructions > Implementing Records`
  Note: Implementing records and record elements contains the following steps.
- [Implementing Scalar, Array or Matrix Elements](../raw/IED_Implementation_NonLogicalElements.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements`
  Note: Implementing scalar, array or matrix elements, including implementation casts, arguments and return values, contains the following steps:
- [Opening the Implementation Editor for an Element (A)](../raw/IEd_open_impl_editor.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Opening the Implementation Editor for an Element (A)`
  Note: To open the implementation editor for an element from the Component Manager, proceed as follows:
- [Opening the Implementation Editor for an Element (B)](../raw/IEd_open_impleditor_for_element.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Opening the Implementation Editor for an Element (B)`
  Note: To open the Implementation editor from the Specification Editor, proceed as follows:
- [Opening the Implementation Editor for an Element (C)](../raw/IEd_open_compo_project.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Opening the Implementation Editor for an Element (C)`
  Note: To open the implementation editor of an element from the implementation editor of a component/project, proceed as follows:
- [Specifying Individual Implementations](../raw/specifying_individual_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations`
  Note: For scalar basic elements, arrays, and matrices, the Use Implementation Type option is deactivated by default. The adjacent combo box is grayed out. You do not have to change anything here to specify an individual implementation. To specify an individual implementation, perform the following steps:
- [Selecting a Formula](../raw/IEd_select_formula.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Selecting a Formula`
  Note: To select a formula, proceed as follows:
- [Setting the Master Page of an Implementation](../raw/set_masterpg_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Setting the Master Page of an Implementation`
  Note: To set the master page of an implementation, proceed as follows:
- [Specifying an Implementation (Master: Model)](../raw/specify_impl_mode.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Specifying an Implementation (Master: Model)`
  Note: To specify an implementation (master: model), proceed as follows:
- [Specifying an Implementation (Master: Implementation)](../raw/specify_impl-master.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Specifying an Implementation (Master: Implementation)`
  Note: <table style="x-cell-content-align: Top;
- [Setting the Limitation](../raw/set_limitation.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Setting the Limitation`
  Note: To set the limitation, proceed as follows:
- [Setting the Overflow Handling](../raw/set_overflow_handling.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Setting the Overflow Handling`
  Note: You can define the overflow behavior. Most options are available in connection with arithmetic services.
- [Selecting a Memory Location](../raw/select_memory_location.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Specifying Individual Implementations > Selecting a Memory Location`
  Note: To select a memory location, proceed as follows:
- [Assigning an Implementation Type](../raw/assign_impl_type.md)
  Context: `Editing Implementations > Instructions > Implementing Scalar, Array or Matrix Elements > Assigning an Implementation Type`
  Note: To assign an implementation type, proceed as follows:
- [Implementing Method-/Process-/Runnable-Local Variables](../raw/impl_localvariables.md)
  Context: `Editing Implementations > Instructions > Implementing Method-/Process-/Runnable-Local Variables`
  Note: i.e. arrays, matrices or records with activated Automatically select the Implementation Type option, or classes
- [Activating Automatic Implementation](../raw/activate_automatic_impl.md)
  Context: `Editing Implementations > Instructions > Implementing Method-/Process-/Runnable-Local Variables > Activating Automatic Implementation`
  Note: To activate automatic implementation for a method-/process-/runnable-local variable, proceed as follows:
- [Implementing Characteristic Lines/Maps](../raw/define_impl_tables.md)
  Context: `Editing Implementations > Instructions > Implementing Characteristic Lines/Maps`
  Note: This instructions do not apply to characteristic lines/maps specified as explicit references. For that case, see Implementing References.
- [Implementing References](../raw/IED_ImplementingReferences.md)
  Context: `Editing Implementations > Instructions > Implementing References`
  Note: The implementation editor for component references opens.
- [Specifying the Implementation for a Logical Element](../raw/specify_impl-logicalelement.md)
  Context: `Editing Implementations > Instructions > Specifying the Implementation for a Logical Element`
  Note: To specify an implementation for a logical element, proceed as follows:
- [Specifying the Memory Location for State Variables](../raw/IEd_SpecifyMemLoc_StateVariables.md)
  Context: `Editing Implementations > Instructions > Specifying the Memory Location for State Variables`
  Note: Code generation for a state machine may generate, depending on the option Hierarchical Code Generation and the use of hierarchy states with history flag, several state variables. Only one of them, the sm variable, is visible in the state machine editor; this variable is used to specify memory location and cache locking for all state variables. Proceed as follows:
- [Specifying an Enumeration Implementation](../raw/specify_enum_impl.md)
  Context: `Editing Implementations > Instructions > Specifying an Enumeration Implementation`
  Note: To specify an enumeration implementation, proceed as follows:
- [Editing a Process/Method Implementation](../raw/IEd_edit_process_method.md)
  Context: `Editing Implementations > Instructions > Editing a Process/Method Implementation`
  Note: To edit a process/method implementation, proceed as follows:
- [Specifying Rescalable Implementations](../raw/ied_specifyrescalableimplementations.md)
  Context: `Editing Implementations > Instructions > Specifying Rescalable Implementations`
  Note: To specify rescalable implementations, you have to
- [Dealing With Operator Implementations](../raw/IEd_DealingWithOperatorImpl.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations`
  Note: Dealing with operator implementations contains the following tasks:
- [Searching for Operator Implementations](../raw/search_op_impl.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations > Searching for Operator Implementations`
  Note: To search for operator implementations, proceed as follows:
- [Removing Operator Implementations](../raw/rename_individual_op_impl.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations > Removing Operator Implementations`
  Note: You can remove individual operator implementations, or you can remove all operator implementations in the database.
- [Viewing an Operator Implementation](../raw/view_op_impl.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations > Viewing an Operator Implementation`
  Note: To view an operator implementation, proceed as follows:
- [Replacing Operator Implementations with Implementation Casts](../raw/replace_op_impl.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations > Replacing Operator Implementations with Implementation Casts`
  Note: To replace operator implementations with implementation casts, proceed as follows:
- [Automatic Conversion of Operator Implementation: Results](../raw/Ied_AutomaticConversion_OperatorImplementation_ResultsA.md)
  Context: `Editing Implementations > Instructions > Dealing With Operator Implementations > Automatic Conversion of Operator Implementation: Results`
  Note: This is not the case for the model type, this is always cont for implementation casts.
- [Reference to User Interface](../raw/IEd_Reference_to_UserInterface.md)
  Context: `Editing Implementations > Reference to User Interface`
  Note: The following windows are described:
- [Implementation Editor for Scalar Elements, Arrays, Matrices](../raw/IEd_Impl_Editor_for_Scalar_Nonlogical_Elements.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Scalar Elements, Arrays, Matrices`
  Note: The implementation editor for scalar elements, arrays and matrices contains the following elements:
- [Implementation Editor for Characteristic Lines/Maps](../raw/ied_implementation_editor_non-scalar_elements.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Characteristic Lines/Maps`
  Note: The implementation editor for characteristic lines/maps contains the following elements:
- [Value Tab](../raw/Value_Tab.md)
  Context: `Editing Implementations > Reference to User Interface > Value Tab`
  Note: The Value tab contains the following elements. Most of them are not available for logical values, enumerations, and automatically generated state variables.
- [AUTOSAR Tab](../raw/ied_autosartab.md)
  Context: `Editing Implementations > Reference to User Interface > AUTOSAR Tab`
  Note: The AUTOSAR tab is only available for elements in AUTOSAR components. It contains the following elements.
- [Implementation Editor for Methods/Processes/Runnables](../raw/ied_implementation_editor_methodsprocesses.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Methods/Processes/Runnables`
  Note: The implementation editor for methods, processes and runnables contains the following elements:
- [Implementation Editor for Components/Projects](../raw/IEd_ImplementationEditor_for_ComponentsProjects.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects`
  Note: Activates/deactivates the possibility to adjust the order of elements in the record.
- [Implementation Menu](../raw/IEd_Implementation_Menu.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects > Implementation Menu`
  Note: This menu is also available as context menu in the Implementation field. It contains the following options.
- [Element Menu](../raw/IEd_Element_Menu.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects > Element Menu`
  Note: This menu is also available as context menu in the tabs. It contains the following options:
- [Settings Tab](../raw/IEd_Settings_Tab.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects > Settings Tab`
  Note: The Settings tab can appear in two variants:
- [External Struct Tab](../raw/IEd_ExternalStruct_Tab.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects > External Struct Tab`
  Note: The External Struct tab is only available for records. It contains the following elements:
- [References Window](../raw/IEd_ReferencesWindow.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Components/Projects > References Window`
  Note: This dialog window displays the results of the Show References item in the Implementation menu. It contains the following window components.
- [Implementation Editor for Component References](../raw/IEd_ImplRefEditor.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation Editor for Component References`
  Note: The implementation editor for referenced components, i.e. the Impl Ref. Editor window, contains the following elements:
- [Implementation for <operator> Window](../raw/IEd_ImplementationforOperatorWindow.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation for <operator> Window`
  Note: Existing implementations for the following operators can be viewed:
- [Implementation for: +/- Window](../raw/IEd_Implementation_for_AddSubWindow.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation for <operator> Window > Implementation for: +/- Window`
  Note: The Implementation for: +/- window contains the following elements:
- [Implementation for: * Window](../raw/IEd_multiplication.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation for <operator> Window > Implementation for: * Window`
  Note: This window contains the following functions:
- [Implementation for: / Window](../raw/IEd_division.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation for <operator> Window > Implementation for: / Window`
  Note: This window contains the following functions:
- [Implementation for: MUX/MAX/MIN Window](../raw/Ied_multiplexer_max_min.md)
  Context: `Editing Implementations > Reference to User Interface > Implementation for <operator> Window > Implementation for: MUX/MAX/MIN Window`
  Note: The Implementation for: mux/max/min window contains the following elements:
