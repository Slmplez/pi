# Interpolation Routines

ASCET provides the following interpolation routines for characteristic lines and maps:

- ASCET Linear (the value is derived from a straight line between the sample values)and ASCET Rounded (the value between two sample points is derived from the sample value at the lower (left) sample point)

These interpolation routines are the same as in previous ASCET versions.

- AUTOSAR 4.0 Interpolate and AUTOSAR 4.0 Look-Up

Interpolation routine declarations for AUTOSAR R4.0.* floating-point and fixed-point interpolation routines.

See the documentation on fixed-point and floating-point interpolation routines on the AUTOSAR web site ([http://www.autosar.org/](http://www.autosar.org/)) for more details.

- Linear and Rounded (alias interpolation routine declarations)

These interpolation routines are alias interpolation routines, i.e. they are mapped to other interpolation routines. Mapping is done in the Project Properties window, Build\OS Configuration node, Interpolation Alias Mapping field.

A default mapping is provided in the ASCET options window, External Tools\Operating System\<os name> node, Interpolation Alias Mapping Default field.

Besides the interpolation routines shipped with ASCET, ASCET supports the following kinds of interpolation routines:

- [User-Defined Interpolation Routines](INT_UserDefinedInterpolationRoutines.md)
- [High-Resolution Interpolation Routines](INT_HighRes_InterpolationRoutines.md)

See also

[Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md)

[User-Defined Interpolation Routines](INT_UserDefinedInterpolationRoutines.md)

[High-Resolution Interpolation Routines](INT_HighRes_InterpolationRoutines.md)
