# Linear Interpolation (1D)

The following example illustrates linear interpolation in characteristic lines (one-dimensional tables). It uses a table LLpr that has the following values:

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 |
| --- | --- | --- | --- | --- | --- | --- |
| 0.0 | 1000.0 | 2000.0 | 3000.0 | 4000.0 | 5000.0 | 6000.0 |
| 0.0 | 0.8 | 1.1 | 1.5 | 1.8 | 2.0 | 2.2 |

In general, the method getAt(Xvalue) is sufficient for the evaluation of characteristic lines. Linear interpolation for this example works as follows:

tmpVal = LLpr.getAt(3000); // assigns 1.5 to tmpVal

tmpVal = LLpr.getAt(2280); // calculates interpolation factor for 2280 // interpolates value for 2280 as 1.212 and // assigns it to tmpVal

tmpVal = LLrp.getAt(9000); // calculates interpolation factor for 9000 // interpolates value for 9000 as 2.2 and // assigns it to tmpVal

In some cases, though, separating the search and interpolate steps in tables can be more efficient, e.g. when generating code for experimental targets. In that case, linear interpolation is performed as follows:

LLpr.search(1000); // sets sample point to 1000

tmpVal = LLpr.interpolate(); // assigns 0.8 to tmpVal

LLpr.search(2780); // calculates interpolation factor for 2780

tmpVal = LLrp.interpolate() // interpolates value for 2780 as 1.412 and // assigns it to tmpVal

In addition to the interpolation routines provided by ASCET, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm), or you can mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The interpolation routines provided with ASCET are examples, not intended to be used in production or in ECUs running in a vehicle. See section "Interpolation Routines" in the ASCET-SE user's guide.

See also

[One-Dimensional Tables - Description](ESDL_One-Dimensional_Tables_-_Description.md)

[Public Interface of One-Dimensional Tables](ESDL_Public_Interface_of_One-Dimensional_Tables.md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)
