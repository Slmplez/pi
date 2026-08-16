# Compatibility Check for Arrays and Matrices

This topic does not apply to arrays/matrices used as messages.

The compatibility of two arrays or matrices is checked on the following occasions:

- an array/matrix element is assigned to an array/matrix reference
- an array/matrix element is passed as method argument
- an array/matrix element is returned by a method
- an array/matrix element is used as initialization value for an array/matrix reference

An array/matrix element can be assigned to an array/matrix reference if the following criteria are met:

- both arrays/matrices have the same base type (cont, limitInt, wrapInt, sdisc, udisc, log)

AND

- both arrays/matrices have the same number of dimensions

AND

- the element implementation type is identical (value range, formula, limitation)

AND

- the respective dimensions are compatible in the following sense:
- an array/matrix with fixed max. size can be assigned to an array/matrix reference with identical fixed max. size
- an array/matrix with fixed max. size can be assigned to an array/matrix reference with variant max. size (the equality of the sizes is checked during code generation or compilation)

OR

- an array/matrix with variant max. size can be assigned to an array/matrix reference with fixed or variant max. size (the equality of the sizes is checked during code generation or compilation)

OR

- an array/matrix with fixed, variant or variable max. size can be assigned to an array/matrix reference with variable max. size

Different from ASCET V6.2, an array/matrix with fixed max. size cannot be assigned to an array/matrix reference with larger fixed max. size. Code generation for existing models that use such assignments will fail. It is recommended that you convert the array/matrix references in these models to arrays/matrices with variable size, either manually or for the entire database.

See also

[Array](INT_Array.md)

[Matrix](INT_matrix.md)

[Variant Size for Arrays and Matrices](INT_VariantSize_ArraysMatrices.md)

[Variable Size for Arrays and Matrices](INT_VariableSize_ArraysMatrices.md)
