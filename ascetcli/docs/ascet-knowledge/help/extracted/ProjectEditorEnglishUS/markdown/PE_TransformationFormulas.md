# Transformation Formulas

The transformation formula for the implementation must be a linear formula. Four types of conversion formulas are supported for displaying this formula. The display of the formula editor adjusts to reflect the formula type you choose.

1. The Identity formula represents an identity mapping.
1. The Linear formula represents a linear mapping with the coefficients c0 (offset) and c1 (gradient).
1. The Moebius formula represents a rational mapping as the quotient of two linear mappings, with the coefficients c0 (numerator offset), c1 (numerator gradient), d0 (denominator offset), and d1 (denominator gradient). The Moebius formula is mainly used to avoid a conversion to the linear formula format when the specification of a linear formula is given in the Moebius formula format.
1. The Five Parameters formula also represents a rational mapping of the same kind in a different format with the coefficients p1, p2, p3, p4 and p56. This formula is also used to avoid a conversion to the linear formula format when the specification of a linear formula is given in the five parameters formula format.

![](asd0232%20copy.gif)

See also

[Adding Formulas](PE_add_formula.md)

[Adding Missing Formulas](Adding_Missing_Formulas.md)

[Importing Formulas](importformula.md)

[Editing the Formula](PE_editformula.md)

[Replacing a Formula Recursively](replaceformula.md)

[Formulas in the ASAM-MCD-2MC File](pe_formulas_asap2file.md)
