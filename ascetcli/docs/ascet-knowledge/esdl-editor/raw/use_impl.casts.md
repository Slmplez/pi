# Using Implementation Casts in ESDL

Unlike the scenario in the block diagram editor, implementation casts can only be added to the ESDL editor using a button.

To use implementation casts in ESDL, proceed as follows:

1. Add the required number of implementation casts using the Implementation cast button.
1. Use the implementation casts in ESDL code in accordance with the rules listed in [Implementation Casts in ESDL](ESDL_Implementation_Casts_in_ESDL.md) and references therein.

1. Implementation casts are referenced by their names.
1. They are always enclosed in parentheses.
1. They are immediately in front of the element they refer to.
1. If an implementation cast refers to the result of an operation, this operation has to be enclosed in parentheses. The operation can be part of a larger calculation.

When you apply an implementation cast to a logical variable or expression, an error message is generated during code generation.

See also

[Implementation Casts in ESDL](ESDL_Implementation_Casts_in_ESDL.md)
