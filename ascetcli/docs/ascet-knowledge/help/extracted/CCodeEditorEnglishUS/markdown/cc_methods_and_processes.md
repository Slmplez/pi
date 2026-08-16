# Methods and Processes

For each method or process a C function is generated. The function head is generated automatically, the C code is only used in the function body itself.

Example:

The body of the method calc ()

a = b + d;

c = a * c;

could result in the following generated code (including function head), depending on the software architecture required for the experimental target:

void QX040H28HJ8HAMDJ870S4G7MDIBQQLSM_calc (struct QX040H28HJ8HAMDJ870S4G7MDIBQQLSM_Obj *self) {

...

/* BEGIN handwritten code */

/* calc 1 */a = b + d;

/* calc 2 */c = a * c;

/* END handwritten code */

...

}

The names of the functions generated for the methods and processes of components depend on the code expander and the software architecture of the generated code. The user has no influence on these names. Depending on the code expander a unique name space is achieved, i.e. methods at different classes can have the same name without any naming conflicts. In the above example the identity tag for the component is used to generate the unique name QX040H28HJ8HAMDJ870S4G7MDIBQQLSM_calc for the method calc.

See also

[Structure](cc_structure.md)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Header](CC_Header.md)

[Conversion of Methods or Processes](BlockDiagramEditorEnglishUS.chm::/BDE_Conversion_MethodsProcesses.htm)
