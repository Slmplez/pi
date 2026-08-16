# Characteristic Lines

Characteristic lines defined in the component are evaluated via three subroutines each (as in ESDL).

Table LLpr from [Linear Interpolation (1D)](ESDLEditorEnglishUS.chm::/esdl_linear_interpolation(1d).htm) is again used as an example for a characteristic line.

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| x axis points | 0.0 | 1000.0 | 2000.0 | 3000.0 | 4000.0 | 5000.0 | 6000.0 |
| values | 0.0 | 0.8 | 1.1 | 1.5 | 1.8 | 2.0 | 2.2 |

The CharTable1_getAt_real64_real64(charline, index) subroutine is usually sufficient for the evaluation of characteristic lines. Linear interpolation for this example works as follows:

tmpVal = CharTable1_getAt_real64_real64(LLpr,3000); // assigns 1.5 to tmpVal

tmpVal = CharTable1_getAt_real64_real64(LLpr,2280); // calculates interpolation factor for 2280 // interpolates value for 2280 as 1.212 and // assigns it to tmpVal

tmpVal = CharTable1_getAt_real64_real64(LLpr,9000); // calculates interpolation factor for 9000 // interpolates value for 9000 as 2.2 and // assigns it to tmpVal

In some special cases, though, separating the search and interpolate steps in tables can be more efficient. In these cases, the subroutines CharTable1_search_real64(charline, index) and CharTable1_interpol_real64_real64(charline) are used.

CharTable1_search_real64(LLpr, 1000); // sets sample point to 1000

tmpVal = CharTable1_interpol_real64_real64(LLpr); // assigns 0.8 to tmpVal

CharTable1_search_real64(LLpr, 2780); // calculates interpolation factor for 2780

tmpVal = CharTable1_interpol_real64_real64(LLpr); // interpolates value for 2780 as 1.412 and // assigns it to tmpVal

In addition to the interpolation routines provided by ASCET, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm), or you can mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The interpolation routines provided with ASCET are examples, not intended to be used in production or in ECUs running in a vehicle. See also the ASCET-SE user's guide.

See also

[Linear Interpolation (1D)](ESDLEditorEnglishUS.chm::/esdl_linear_interpolation(1d).htm)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Maps](CC_Characteristic_Maps.md)
