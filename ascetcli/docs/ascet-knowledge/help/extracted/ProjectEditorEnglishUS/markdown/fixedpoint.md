# Integer Arithmetic Node

The settings in this node affect neither physical and quantized experiments nor Object Based Controller Physical.

This node contains the following options:

##### Arithmetic Service Set

In this combo box, you select the set of [arithmetic services](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm) you want to use. The combo box lists all sets available in the services.ini file of the current target; in addition, you can select <None> to switch off the use of arithmetic services.

Use the Edit button to open the [interface editor for arithmetic services](ArithmeticServicesEnglishUS.chm::/interface_editor_as.htm).

##### Result on Division by Zero

When ASCET generates code to protect against division by 0 (activated via the [Protected against Division by Zero](PE_Code_Generation_Options.md#Protect_Div_by_Zero) option), this combo box determines the behavior upon division by zero.

If you select numerator (default), the numerator, limited to [value_range_min, value_range_max], is returned as result.

If you select user defined, a call to the user-defined C macro protDiv0(num, value_range_min, value_range_max) is returned. This macro has to be specified in one of the included header files.

Make sure that the protDiv0 macro exists, and is correct, when you want to use the user defined option. An automatic existence or syntax check is not performed.

The macro arguments have the following meaning:

- num - the current numerator value
- value_range_min - the lower boundary of the value range calculated by ASCET for the division
- value_range_max - the upper boundary of the value range calculated by ASCET for the division

The second and third argument are used—in that order—to use the minimum and maximum of the value range of the division result. It is possible, for example, to provide the macro

#define protDiv0(num,min,max) (num<0?min:max)

to get, depending on the result data type, the largest, or smallest, possible integer value.

The user macro is supposed to return a value in the range [value_range_min, value_range_max], because ASCET expects this for further optimizations.

##### Maximum bit Length (int)

Determines whether the code generated for integer variables uses 8, 16 or 32 bit arithmetic in the expressions for fixed-point arithmetic.

##### Allow Double bit Size for Division Numerators

Allows twice the bit size set in maximum bit length for intermediate results of multiplications followed by a division (default: activated).

##### Use SHIFT Operation on Signed Values Instead of DIV Operation

Generates right shifts instead of division operations for divisions of signed numbers (default: deactivated).

Some compilers use logical instead of arithmetic right shifts. This may lead to sign errors if the option is not deactivated.

Enabling this option will cause the generated code to violate MISRA-C:2004 Rule 12.7.

##### Use SHIFT Operation on Signed Values Instead of MUL Operation

Generates left shifts instead of multiplication operations for multiplication of signed numbers (default: deactivated).

Some compilers use logical instead of arithmetic left shifts. This may lead to sign errors if the option is not deactivated.

Enabling this option will cause the generated code to violate MISRA-C:2004 Rule 12.7.

##### Generate Round Operation on float to integer Assignment

Activates or deactivates rounding when a floating-point variable is assigned to an integer variable. Rounding is done by adding (positive values) or subtracting (negative values) 0.5. If the option is deactivated, the decimal places are truncated (default: activated).

##### Generate float limiter on assignment

If the option is activated, each assignment to a float-typed model element is limited with respect to the physical model interval specified. If the lower bound is -oo, no limitation is generated for the lower bound. If the upper bound is +oo, no limitation is generated for the upper bound. The generated limiter code can optionally be replaced by limit services.

If the option is activated and the initial value of a modifiable element (variable, message, etc.) is outside the model interval specified in the implementation, a warning WMdl7 is issued during code generation.

If the option is activated and the initial value of a non-modifiable element (parameter, system constant) is outside the model interval specified in the implementation, an error MMdl44 is issued during code generation.

If the option is deactivated (default), no limit code will be generated.

##### Temp Vars always 32 bit (integer)

Creates 32 bits for all temporary integer variables. If this option is deactivated, bit widths are generated flexible, depending on the actual requirements (default: deactivated).

##### Use power of 2 approximations of literals

If the option is activated, the code generation searches, for multiplications and divisions with fractions, another fractions approximation where either numerator or denominator is a power of 2.

The optimization is applied only if an approximation is found that deviates at most 1 ‰ from the original fraction, and if the approximates literal induces no overflow.

You can set a threshold for the relative deviation of the approximation in the ASCET Options window, Build node, [Warning threshold for power of two literals](ComponentManagerEnglishUS.chm::/cm_build_options.htm#WarningThreshold) option. When the relative error exceeds this threshold, a warning WIle18 is issued during code generation.

An example: If the option is deactivated (default), the following code is generated:

result = input * (sint32)433 / (sint16)500;

If the option is activated, the generated code becomes

result = input * 28377 >> 15;

The precision is almost identical in both cases, but the runtime-consuming division operation is replaced by an effective and fast shift.

##### New Behaviour for Discrete Types

If activated, the generation of sdisc and udisc calculations is changed as follows, so that the elements behave like [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm):

- If the Limit Assignments option in the implementation editor is activated, the calculations are generated as specified in the model, with limitation on assignment. An error is issued if the calculation may overflow.
- If the Limit Assignments option in the implementation editor is deactivated, the calculations are generated as specified in the model, and they wrap around on overflow, both during calculations and on assignments.

Calculations with a potentially changed behavior are indicated by warnings of types WIle110, WIle111, WIle112, WIle113, WIle114, WIle115.

See also [Testing the New Behavior for Integer Types](IntroductionEnglishUS.chm::/INT_Test_NewBehavior_IntegerTypes.htm).

See also

[Arithmetic Services - Overview](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)

[Interface Editor for Arithmetic Services](ArithmeticServicesEnglishUS.chm::/interface_editor_as.htm)

[Testing the New Behavior for Integer Types](IntroductionEnglishUS.chm::/INT_Test_NewBehavior_IntegerTypes.htm)
