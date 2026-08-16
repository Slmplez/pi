# Using Copy From

As C code is always platform-dependent, you have to specify the code of a C code component for each combination of target, arithmetic (or experiment type), and implementation individually. You can copy code developed for one combination to another one.

If the body of a C code method or process is empty for the combination of target, arithmetic, and implementation selected in the associated project, the following warning is issued: WARNING (WBDL2): component name (using <C Code>) is not defined If an empty method requires a return value, an error is issued: ERROR(YBdl22): method <name> must be defined; need a return value

To copy existing C code of a single class or module to another combination of target, arithmetic, and implementation, use one of the two possibilities described here (via Copy From) and in [Copying C Code for Single Classes or Modules](copy_ccode_single.md).

1. Open the module/class in the C code editor.
1. In the C code editor, use the Target, Arithmetic, and Implementation combo boxes to select the target, experiment type, and implementation you intend to use.
1. In the Tools menu, point to Code Variants and select Copy From.

The Selection Required window opens.

1. Select the target, experiment type, and implementation you want to copy the code from, and click OK.

The C code is copied to the current target.

See also

[Copying C Code for Single Classes or Modules](copy_ccode_single.md)
