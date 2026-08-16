# Defining the Implementation for Fixed-Point Arithmetic

When generating production code for microcontrollers, the arithmetic of the physical ASCET specification often has to be mapped to fixed-point arithmetic, since many microcontrollers used in electronic control units do not support floating-point arithmetic. This mapping is described by the implementation transformation, or implementation for short.

Like data sets, each component or project may have any number of implementations. Like data sets, implementations can be viewed, edited, renamed, deleted, browsed, exported (flat, recursive as well as generic), added and copied.

As with data sets there are special editors for the basic elements which form the leaves of the hierarchical tree structure of a project or component. Implementation of the basic elements of types continuous or discrete requires specification of a range for the physical values and a transformation formula.

Many elements within a project usually have the same transformation formula, for instance all the velocities processed in the embedded software. It is possible to define formulas only once within a project, and then use them across all the elements in that project. Formulas can also be exchanged between projects with an import/export mechanism.

ASCET also supports the intermediate step of generating quantized floating-point code. With this type of code fixed-point arithmetic is emulated, but the links and the quantization of the fixed-point arithmetic can be changed interactively during execution of the code. This intermediate step allows development of the optimum implementation for the elements in a specific project.

You can

[Add formulas](PE_add_formula.md)

[Add missing formulas](Adding_Missing_Formulas.md)

[Edit a formula](PE_editformula.md)

[Import](importformula.md) and [export](fileoutformulas.md) formulas

[Replace a formula recursively](replaceformula.md)

See also

[Transformation Formulas](PE_TransformationFormulas.md)

[Formulas in the ASAM-MCD-2MC File](pe_formulas_asap2file.md)

[Global Changes in Implementations](Globalchanges.md)

[Implementation Types](PE_ImplementationTypes.md)
