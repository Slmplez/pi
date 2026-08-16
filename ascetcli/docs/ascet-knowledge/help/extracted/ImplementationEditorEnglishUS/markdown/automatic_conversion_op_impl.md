# Automatic Conversion of Operator Implementations

You can delete operator implementations in old models (see [Removing an Individual Operator Implementation](rename_individual_op_impl.md)) or replace them automatically with [implementation casts](IntroductionEnglishUS.chm::/INT_implementation_casts.htm). Automatic replacing applies to the entire database, not to individual components.

## Rules for Automatic Conversion

The following conditions have to be fulfilled for an operator implementation to be converted automatically.

1. The operator implementation must not contain any other quantization than Auto ([addition, subtraction](IEd_Implementation_for_AddSubWindow.md), [MIN, MAX and MUX](Ied_multiplexer_max_min.md)).
1. The operator ([+, -](IEd_Implementation_for_AddSubWindow.md), [*](IEd_multiplication.md), [/](IEd_division.md)) output must be connected to primitive elements.
1. If an implementation cast is connected to the operator ([+, -](IEd_Implementation_for_AddSubWindow.md), [*](IEd_multiplication.md), [/](IEd_division.md)) output, something other than No implementation has to be selected for this implementation cast in the combo box next to the Use Implementation Type option in the implementation editor.
1. The operator ([*](IEd_multiplication.md), [/](IEd_division.md)) implementation must not contain any special pre-shift.
1. If the operator is a [division](IEd_division.md) operator and the Allow zero in phys. interval option is activated in the operator implementation, the following rules also apply for the denominator input:

1. The denominator input must be connected to primitive elements.
1. If an implementation cast is connected to the denominator input, something other than No implementation has to be selected for this implementation cast in the combo box next to the Use Implementation Type option in the implementation editor.

If one of these conditions is not fulfilled in any implementation of the component, the relevant operator has to be converted manually.

See also

[Removing Operator Implementations](rename_individual_op_impl.md)

[Implementation Casts](IntroductionEnglishUS.chm::/INT_implementation_casts.htm)

[Replacing an Operator Implementation with an Implementation Cast](replace_op_impl.md)

[Implementation for: +/- Window](IEd_Implementation_for_AddSubWindow.md)

[Implementation for: * Window](IEd_multiplication.md)

[Implementation for: / Window](IEd_division.md)

[Implementation for: MUX/MAX/MIN Window](Ied_multiplexer_max_min.md)

[Implementations of Components/Projects](IEd_impl_comp_proj_s.md)
