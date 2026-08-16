# User-Defined Interpolation Routines

In some cases more complex mathematical functions and hysteresis behavior have to be implemented for interpolation.

Therefore, ASCET provides the possibility to include user-defined interpolation routines. These interpolation routines can be used for all targets.

The interpolation routine can either be specified as C code class in ASCET or defined with header file and object library.

For each user-defined interpolation routine, the following information must be provided in the form of [an ASCET options set](INT_CreateOptionSet_UDIR.md):

- a unique identifier
- a unique label that is used throughout the ASCET user interface for the interpolation routine
- a flag that marks an interpolation routine as alias interpolation routine
- If the interpolation routine is defined with header file and object library:
- one or more [mapping files](INT_MappingFileUDIR.md) (*.ini) that map the ASCET interpolation routines search, interpol and getAt to function names in the generated code
- optional overlay icons (*.ico) for characteristic lines/maps (to indicate the selected interpolation routine in a block diagram)
- optional restrictions for the axes of characteristic lines/maps
- a flag to enable map optimization (the axes are swapped if the x axis type is smaller than the y axis type, i.e. it occurs earlier in the following list of types: s8, u8, s16, u16, s32, u32)
- a flag to allow single precision for storage and double precision for calculation of the interpolation
- input fields for the types that are used to store the results of a distribution search for integer and floating-point distributions.
- input fields for initial values to be used as integer and floating-point distribution search result.

The option sets for linear and rounded interpolation are provided by ASCET. If desired, you can adjust the settings to use your own code instead of the interpolation routines provided by ASCET.

See also

[Mapping File for User-Defined Interpolation Routine](INT_MappingFileUDIR.md)

[Including User-Defined Interpolation Routines](INT_IncludeUDIR.md)

[Creating an Option Set for an Interpolation Routine](INT_CreateOptionSet_UDIR.md)

[Creating the Mapping for User-Defined Interpolation Routines](INT_CreateMapping_UDIR.md)

[Interpolation Routines](INT_InterpolationRoutines.md)

[H](INT_HighRes_InterpolationRoutines.md)igh-Resolution Interpolation Routines

[Characteristic Lines and Maps](INT_characteristic_lines_and_maps.md)
