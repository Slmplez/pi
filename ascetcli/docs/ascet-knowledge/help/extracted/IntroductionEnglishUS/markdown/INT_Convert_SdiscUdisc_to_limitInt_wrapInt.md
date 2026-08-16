# Converting sdisc/udisc to limitInt/wrapInt

Elements that use the deprecated sdisc/udisc types can be converted to limitInt/wrapInt types.

Several [conversion rules](#ConversionRules) apply to these conversions, context of a projectas well as several [restrictions](#Restrictions). For each element that cannot be converted, an information message is shown in the ASCET monitor window.

See [Converting Old Integer Types to New Integer Types](ComponentManagerEnglishUS.chm::/CM_Convert_OldIntTypes_NewIntTypes.htm) for a step-by-step instruction.

If desired, you can [testing the new behavior for integer types](INT_Test_NewBehavior_IntegerTypes.md) before you convert them permanently.

## Conversion Rules:

Unless otherwise noted, the rules listed here apply to database/workspace-wide conversion and component-wide conversion.

1. IF

all existing implementations of an exported or local sdisc/udisc element are identical

AND

the formula is the identity formula

AND

the Limit Assignments option is activated,

THEN

the element is converted to limitInt. The implementation interval is used as min/max for the new type.

1. IF

all existing implementations of an exported or local sdisc/udisc element are identical

AND

the formula is the identity formula

AND

the Limit Assignments option is deactivated,

THEN

the element is converted to wrapInt. The implementation data type is used as type for wrapInt, the implementation interval is used as min/max for the new type.

1. Imported elements have no implementation.
1. Elements in child components of a project are converted if rules 1 - 3 are fulfilled.
1. In all other cases, the element is not converted.

## Restrictions

The following restrictions apply to database/workspace-wide and component-wide conversions of sdisc/udisc to limitInt/wrapInt:

- Write-protected components are not changed.
- Elements with activated Rescalable option are not converted.
- Elements with a real* implementation data type are not converted.
- Constants are not converted.
- Method-/process-/runnable-local elements without implementation are not converted.
- Characteristic lines/maps and distributions are not converted.

The following restrictions apply only to database/workspace-wide conversions of sdisc/udisc to limitInt/wrapInt:

- Elements in components that do not belong to a project are not converted.

The following restrictions apply only to component-wide conversions of sdisc/udisc to limitInt/wrapInt:

- Elements in child components of a non-project component are not converted.

See also

[Converting Old Integer Types to New Integer Types](ComponentManagerEnglishUS.chm::/CM_Convert_OldIntTypes_NewIntTypes.htm)

[Scalar Types](INT_scalar_summary.md)

[Scalar Types: Limited Integer](INT_ScalarTypes_LimitedInteger.md)

[Scalar Types: Wrap-Around Integer](INT_ScalarTypes_WrapAroundInteger.md)

[Using the Conversion Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseConversionOperator.htm)

[Conversion Operations](ESDLEditorEnglishUS.chm::/ESDL_ConversionOperations.htm)

[Testing the New Behavior for Integer Types](INT_Test_NewBehavior_IntegerTypes.md)
