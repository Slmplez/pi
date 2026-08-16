# Protection Against Division by Zero

The code generation assumes that the implementation interval can include zero. It is checked whether the denominator of a division contains zero. You can switch off the check in the Project Properties window, [Code Generation](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) node, Protected against Division by Zero option. In that case, the code generator takes the interval into account, e.g. a division by [0..100] is not protected.

If required, C code is generated that prevents a possible division by zero at runtime. The Result on Division by Zero option in the [Integer Arithmetic](ProjectEditorEnglishUS.chm::/fixedpoint.htm) node of the Project Properties window can be used to determine the behavior upon division by zero.

The option Zero not included (available in ASCET V5.0 - V6.3) is no longer available in ASCET V6.4. When working with older models that contain this flag, Zero not included is always treated as deactivated, i.e. code generation assumes that zero is included in the interval.

See also

[Integer Arithmetic Node](ProjectEditorEnglishUS.chm::/fixedpoint.htm)

[Code Generation Node](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
