# Linear Interpolation (2D)

The following example illustrates linear interpolation in characteristic maps (two-dimensional tables). It uses a table LLpr2 that has the following values:

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
| --- | --- | --- | --- | --- |
| y \ x | 0.0 | 1.0 | 8.0 | 15.0 |
| 1.0 | -5.0 | -3.0 | 0.0 | 1.0 |
| 3.0 | 0.0 | 1.0 | 4.0 | 6.0 |
| 5.0 | 8.0 | 5.0 | 4.0 | 4.0 |

As with characteristic lines, the method getAt (Xvalue,Yvalue) contains everything that is needed for the evaluation of characteristic maps. Linear interpolation for this example works as follows:

tmpVal = LLpr2.getAt(8,5); // assigns 4.0 to tmpVal

tmpVal = LLpr2.getAt(0.5,1.5); // calculates interpolation factor for // x=0.5 and y=1.5 // interpolates value for (0.5,1.5) as -2.875 and // assigns it to tmpVal

tmpVal = LLrp2.getAt(20,10); // calculates extrapolation factor for x=20, y=10 // extrapolates value for (20,10) as 5.0 and // assigns it to tmpVal

With characteristic maps, too, separating the search and interpolate steps in tables can be more efficient. In that case, linear interpolation is performed as follows:

LLpr2.search(1,3); // sets x sample point to 1 and y sample point to 3

tmpVal = LLpr2.interpolate(); // assigns 1.0 to tmpVal

LLpr2.search(4,4); // calculates interpolation factor for x=4, y=4

tmpVal = LLrp2.interpolate() // interpolates value for (4,4) as 3.143 and // assigns it to tmpVal

In addition to the interpolation routines provided by ASCET, you can add [user-defined interpolation routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm), or you can mark interpolation routines as [high-resolution](IntroductionEnglishUS.chm::/INT_HighRes_InterpolationRoutines.htm).

The interpolation routines provided with ASCET are examples, not intended to be used in production or in ECUs running in a vehicle. See section "Interpolation Routines" in the ASCET-SE user's guide.

See also

[Two-Dimensional Tables - Description](ESDL_Two-Dimensional_Tables_-_Description.md)

[Public Interface of Two-Dimensional Tables](ESDL_Public_Interface_of_Two-Dimensional_Tables.md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[High-Resolution Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)
