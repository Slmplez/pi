# Potential Error Conditions

If the use of arithmetic services is enabled, the code generator depends on the validity and completeness of the arithmetic services.

The following error message is generated for all targets if an arithmetic service is required for an operation but is not found in the selected set:

Arithmetic service <name> required but not defined.

This behavior is limited to all operations that are derived from purely arithmetic operations (+, -, *, /, abs, neg).

Unlike earlier versions of ASCET, no standard operations are used in this case by this version!

To ensure that a corresponding arithmetic service is defined for each operation, the standard operations can be integrated into the corresponding set by adding wildcard functions. In this case, a corresponding entry must be present for each operation that is derived from an arithmetic operation (+, -, *, /, abs, neg).

For an addition, this entry would appear as follows:

+|*|*|*=(%i1% + %i2%)

For a combined multiplication/division, it would appear as such:

*/|*|*|*|*=((%i1% * %i2%) / %i3%)

The code generator then replaces the wildcards *) with all theoretically possible combinations of types.

If, for a special type combination (such as +|u8|s8|s8 = add_u8s8_s8(%i1%, %i2%)), there is a function definition in the current set, it takes precedence over the standard operation.

ASCET generates this warning

Usage of arithmetic service <name> requires extra code for requantization

if all elements that are directly connected to an arithmetic operation (+, -, *, /, abs, neg) are implementation casts and the user has specified differing quantizations for these.

If there are no defined functions in the current set for the services getHighPart and modulo, the code generator uses the standard operations from ASCET without generating a warning message or notification.
