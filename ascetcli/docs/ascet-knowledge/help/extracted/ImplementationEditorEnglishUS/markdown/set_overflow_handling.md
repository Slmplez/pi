# Setting the Overflow Handling

You can define the overflow behavior. Most options are available in connection with arithmetic services.

1. Activate the Limit to maximum bit length option if the result of an operation shall be limited in case of overflow.

If the result value range exceeds the range specified in the [Integer Arithmetic node](ProjectEditorEnglishUS.chm::/fixedpoint.htm), code is generated that avoids the overflow.

The combo box next to the option is activated.

1. From the combo box, select Reduce Resolution if the resolution can be reduced upon limiting.

This option avoids an overflow by right-shifting the inputs, if necessary. The shift is determined automatically.

1. Select Keep Resolution if the resolution shall not be reduced upon limiting.

If arithmetic services are activated, this option avoids an overflow by using limiting services, if necessary.

If not, code generation is aborted with an error message.

1. Select Automatic to make overflow handling dependent on the use of arithmetic services.

If this is enabled, the Keep resolution method is used in case of overflow limiting. If not, the Reduce resolution method is used.

See also

[Arithmetic Services - Overview](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)

[Adjusting the Project Settings](ProjectEditorEnglishUS.chm::/adjustcode_gen.htm)

[Limitations](IEd_Limitations.md)

[Integer Arithmetic Node](ProjectEditorEnglishUS.chm::/fixedpoint.htm)
