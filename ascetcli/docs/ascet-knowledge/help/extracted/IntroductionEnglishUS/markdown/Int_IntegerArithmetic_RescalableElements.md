# Integer Arithmetic with Rescalable Elements

A rescalable element has a linear formula with positive scale and zero offset. However, the scale is multiplied with an (unknown) factor, which is supplied by the rescaling formula of the component (see [Components with Rescalable Elements](int_componentsrescalableelements.md)).

In this topic, scale and offset refer to the scale and offset of the element formula without considering the (unknown) factor.

Unless noted otherwise, the result of an operation with rescalable operands is also rescalable (see also [Operations with Rescalable Elements](INT_OperationsRescalableElements.md)).

The integer arithmetic for rescalable elements is defined as follows:

- +, -

The operands are converted to a common scale, then the operation is performed as for non-rescalable elements. The formula of the result has the common operand scale.

- min, max, mux, case (in block diagrams), between

The operands are converted to a common scale, then the operation is performed as for non-rescalable elements. The formula of the result has the common operand scale.

- *

The operands are converted to zero offset, then the operation is performed as for non-rescalable values. The formula of the result has the product of the operand scales and zero offset.

- /

The operands are converted to zero offset, then the operation is performed as for non-rescalable values.

If only the numerator is rescalable, the result is rescalable; its formula has a scale equal to the quotient of the operand scales and zero offset.

If both operands are rescalable, the result is not rescalable; its formula has a scale equal to the quotient of the operand scales and zero offset.

- assignment, return, method argument, impl. cast

The right-hand side is converted to the scale of the left-hand side. The result of the assignment and impl. cast has the formula of the left-hand side.

- ==, !=, <, <=, >=, >

The operands are converted to a common scale, then the comparison is performed as for non-rescalable values. The result is a Boolean value and thus never rescalable.

- neg, abs

The operation is performed as for non-rescalable values. The result has the same scale as the operand.

See also

[Operations with Rescalable Elements](INT_OperationsRescalableElements.md)

[Elements with Rescalable Implementation](INT_ElementsRescalableImpl.md)

[Components with Rescalable Elements](int_componentsrescalableelements.md)

[Project Editor - Transformation Formulas](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm)
