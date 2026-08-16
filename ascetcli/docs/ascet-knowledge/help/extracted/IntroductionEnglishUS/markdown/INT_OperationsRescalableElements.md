# Operations with Rescalable Elements

Several operations are possible with arithmetic elements. The following restrictions apply for operations with rescalable elements:

- +, -, min, max, mux, case (in block diagrams), between

The operands must either all be rescalable or all non-rescalable. Otherwise, an error (code MMdl6) is issued during code generation.

If the operands are rescalable, the result is rescalable, too. It must be assigned to a rescalable element.

- *

At most one operand can be rescalable. If two (or more) operands are rescalable, an error (code MMDL632) is issued.

If one operand is rescalable, the result is rescalable, too. It must be assigned to a rescalable element.

- /

When the denominator is not rescalable, the numerator can be rescalable or not rescalable. When the denominator is rescalable, the nominator must be rescalable, too; otherwise, an error (code MMDL633) is issued.

If only the numerator is rescalable, the result is rescalable, too. It must be assigned to a rescalable element.

If numerator and denominator are rescalable, the result is not rescalable.

- assignment, return, method argument, impl. cast

The left side and the right side must either both be rescalable or both non-rescalable. Otherwise, an error (code MMdl6) is issued.

- ==, !=, <, <=, >=, >

The operands must either both be rescalable or both non-rescalable. Otherwise, an error (code MMdl6) is issued.

The result is of type logic and thus non-rescalable.

- neg, abs

The operand and the result must either both be rescalable or both non-rescalable. Otherwise, an error (code MMdl6) is issued.

- mod, ++, --

The operand must not be rescalable. If the operand is rescalable, an error (code MMdl622) is issued.

The rescalability of primitive expressions is defined as follows:

- Constants and literals are not rescalable.
- Local identifiers are rescalable if the element implementation is rescalable.
- Array index accesses are rescalable if the array element implementation is rescalable.
- Record field accesses are not rescalable.
- Method returns are rescalable if the implementation of the return element is rescalable and the method is invoked on the self instance.

If a method is invoked on any other instance, the return is not rescalable.

See also

[Integer Arithmetic with Rescalable Elements](Int_IntegerArithmetic_RescalableElements.md)

[Elements with Rescalable Implementation](INT_ElementsRescalableImpl.md)

[Components with Rescalable Elements](int_componentsrescalableelements.md)
