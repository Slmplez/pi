# Copying C Code for Single Classes or Modules

As C code is always platform-dependent, you have to specify the code of a C code component for each combination of target, arithmetic (or experiment type), and implementation individually. You can copy code developed for one combination to another one.

If the body of a C code method or process is empty for the combination of target, arithmetic, and implementation selected in the associated project, the following warning is issued: WARNING (WBDL2): component name (using <C Code>) is not defined If an empty method requires a return value, an error is issued: ERROR(YBdl22): method <name> must be defined; need a return value

To copy existing C code of a single class or module to another combination of target, arithmetic, and implementation, use one of the two possibilities described here (via Copy To) and in [Using Copy From](CC_copy_code_from.md).

1. Open the module/class in the C code editor.
1. In the Target combo box, select the target the C code was written for.
1. In the Arithmetic combo box, select the experiment type the C code was written for.
1. In the Implementation combo box, select the implementation the C code was written for.
1. In the Tools menu, point to Code Variants and select Copy To.
1. In the Code for Target field, select the target to which you want to copy the code.
1. In the Code Gen. Arithmetic field, select the appropriate experiment type.
1. In the Implementation field, select the implementation you want to use.
1. Click on OK.

The C code is copied to the selected combination of target, arithmetic, and implementation.

See also

[Using Copy From](CC_copy_code_from.md)
