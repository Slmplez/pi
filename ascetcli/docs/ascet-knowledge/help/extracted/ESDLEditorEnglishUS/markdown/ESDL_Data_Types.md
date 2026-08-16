# Data Types

ESDL is strongly typed and variables must be declared. The procedure here is the same as when editing block diagrams. Variables are added to the elements list and can then be edited as needed.

The following data types are available in ESDL: limitInt, wrapInt, udisc, sdisc, cont and log. They can be added to a class or module by selecting the corresponding element from the editor toolbar.

The ESDL method or process body itself does not contain variable declarations. Only variables local to the current method/process can be declared and initialized in the method body using a statement like the following:

cont set = 12.34;

cont temp = 0.78e4;

udisc i = 3, j, k;

sdisc aVar = -12;

log trigger = true;

You cannot declare and initialize method-/process-local elements of limitInt and wrapInt types in the method/process body. Use the Locals tab in the [signature editor](BlockDiagramEditorEnglishUS.chm::/bde_interface_editor.htm) instead.

See also

[Scalar Types: Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types: Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Scalar Types - Summary](IntroductionEnglishUS.chm::/INT_scalar_summary.htm)

[Working with Methods and Processes](esdl_working_with_methods_and_processes.md)

[ESDL Syntax](ESDL_ESDL_Syntax.md)

[Variable Names](ESDL_Variable_Names.md)

[Type Conversion](ESDL_Type_Conversion.md)

[Primitive Methods](ESDL_Primitive_Methods.md)

[Implementation Casts in ESDL](ESDL_Implementation_Casts_in_ESDL.md)

[Signature Editor](BlockDiagramEditorEnglishUS.chm::/bde_interface_editor.htm)
