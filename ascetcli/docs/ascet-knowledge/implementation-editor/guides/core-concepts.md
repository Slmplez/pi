# Implementation Editor Core Concepts

These pages cover the editor's main objects, basic concepts, and foundational terminology.

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
