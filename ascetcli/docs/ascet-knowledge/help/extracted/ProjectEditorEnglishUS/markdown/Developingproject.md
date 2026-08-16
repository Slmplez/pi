# Developing a Project

A project is developed in a modular manner, by first developing and testing the individual components of the system, and then combining them into a project. Developing a project involves the following steps:

- Creating the empty project (see [Creating a New Project](PE_createproject.md)).
- Selecting the modules or AUTOSAR software components (SWC) that make up the system (see [Including a Component in a Project](specifyingproject.md)). The definitions of the components and SWC are referenced, i.e. if the definition of a component/SWC is changed, this change directly affects all the projects that use the component/SWC.
- Adjusting the project settings ([Adjusting the Project Settings](adjustcode_gen.md)), e.g. selecting a target and operating system, setting code generation options, etc., and resolving global variables (see [Defining Global Communication](definingglobalcommin.md)).
- Defining the overall control flow of the embedded software system by setting up the real-time operating system (see [Scheduling in the OS Editor](schedulingos%20.md)).

This step is obsolete for projects that contain AUTOSAR software components. The "OS" tab is present when you create the project, and add the SWC, but the tab content is ignored and the tab disappears when you close the project editor. Internal scheduling for Atomic software components is set up in the [Event Specification](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeventSpecificationView.htm) view of the software component editor, global scheduling is set up during runtime environment configuration.

- Specifying the implementation transformation for generating code with fixed point arithmetic (see [Defining the Implementation for Fixed Point Arithmetic](definingimplementation.md)). In order to define this implementation, the transformation formula must be included in the project (see [Adding Formulas](PE_add_formula.md)).

Like components, projects can have multiple data sets and implementations. Therefore, when executable code is generated from the formal definition the appropriate variant has to be chosen. The current variant of a project is defined by selection of the data set (this is also possible when experimenting with components only) and of the implementation transformation.

Defining an implementation is only necessary for generating code with fixed point arithmetic. When only floating point arithmetic is needed (e.g. in a bypass environment) the implementation transformation need not be defined.

The code generation can be adjusted for a specific project by selecting the code variant and the target platform for which code is to be generated. Code can be generated for three types of arithmetic: floating point arithmetic, fixed point arithmetic and quantized floating point arithmetic. The latter is a simulation of fixed point arithmetic based on floating point arithmetic, where the effects of quantization can be studied, and the quantization and the value bounds can be changed interactively while executing the code.

See also

[Creating a New Project](PE_createproject.md)

[Including a Component in a Project](specifyingproject.md)

[Adjusting the Project Settings](adjustcode_gen.md)

[Project Settings](projectsettings.md)

[Defining Global Communication](definingglobalcommin.md)

[Scheduling in the OS Editor](schedulingos%20.md)

[Defining the Implementation for Fixed Point Arithmetic](definingimplementation.md)

[Adding Formulas](PE_add_formula.md)

[Atomic Software Component Editor - Event Specification view](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeventSpecificationView.htm)
