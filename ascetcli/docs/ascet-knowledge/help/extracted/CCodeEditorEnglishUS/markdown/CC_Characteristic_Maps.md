# Characteristic Maps

Characteristic maps defined in the component are evaluated via three subroutines each (as in ESDL).

Table LLpr2 from [Linear Interpolation (2D)](esdleditorenglishus.chm::/esdl_linear_interpolation_(2d).htm) is again used as an example for a characteristic map:

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- |
| y \ x | 0.0 | 1.0 | 8.0 | 15.0 |
| 1.0 | -5.0 | -3.0 | 0.0 | 1.0 |
| 3.0 | 0.0 | 1.0 | 4.0 | 6.0 |
| 5.0 | 8.0 | 5.0 | 4.0 | 4.0 |

The CharTable2_search_real64_real64(charline,indx, indY)subroutine is usually sufficient for the evaluation of characteristic lines. Linear interpolation for this example works as follows:

tmpVal = CharTable2_getAt_real64_real64_real64(LLpr2,8,5) // assigns 4.0 to tmpVal

tmpVal = CharTable2_getAt_real64_real64_real64(LLpr2,2,2); // calculates interpolation factor for x=2 and y=2 // interpolates value for (2,2) as -0.571 and // assigns it to tmpVal

tmpVal = CharTable2_getAt_real64_real64_real64(LLpr2,20,9); // calculates extrapolation factor for x=20, y=10 // extrapolates value for (20,10) as 5.0 and // assigns it to tmpVal

In some special cases, though, separating the search and interpolate steps in tables can be more efficient. In these cases, the subroutines CharTable2_search_real64_real64(charmap,indX, indY) and CharTable2_interpol_real64_real64_real64(charmap) are used.

CharTable2_search_real64_real64(LLpr2, 1, 3); // sets x sample point to 1 and y sample point to 3

tmpVal = CharTable2_interpol_real64_real64_real64(LLpr2); // assigns 1.0 to tmpVal

CharTable2_search_real64_real64(LLpr2,4,4); // calculates interpolation factor for x=4, y=4

tmpVal = CharTable2_interpol_real64_real64_real64(LLpr2); // interpolates value for (4,4) as 3.143 and // assigns it to tmpVal

In addition to the interpolation routines provided by ASCET, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm), or you can mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The interpolation routines provided with ASCET are examples, not intended to be used in production or in ECUs running in a vehicle. See also the ASCET-SE user's guide.

See also

[Linear Interpolation (2D)](esdleditorenglishus.chm::/esdl_linear_interpolation_(2d).htm)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Two-Dimensional Tables - Description](ESDLEditorEnglishUS.chm::/ESDL_Two-Dimensional_Tables_-_Description.htm)
