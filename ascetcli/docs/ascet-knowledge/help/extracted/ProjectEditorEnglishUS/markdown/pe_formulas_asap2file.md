# Formulas in the ASAM-MCD-2MC File

When you generate an ASAM-MCD-2MC file for an ASCET project, information about the formulas used to transform implemented values into model values and vice versa is added to the ASAM-MCD-2MC file.

##### Normal elements

For an element with normal, i.e. non-rescalable, implementation, the formula written to the ASAM-MCD-2MC file is the formula selected in the implementation editor of the element. Any rescaling formula of the component that contains the normal element is ignored.

[Example for a normal element](pe_examples_formulas_asap2file.md#normal)

##### Rescalable elements

For an element with rescalable implementation, i.e. a rescalable element, the formula written to the ASAM-MCD-2MC file is created from the formula in the element's implementation editor and the rescaling formula of the component that contains the rescalable element. In addition, the minimum and maximum limits written to the ASAM-MCD-2MC file are re-calculated with the new formula.

The formula written to the ASAM-MCD-2MC file is calculated by multiplying the element formula with the rescaling formula. It is named according to the following scheme:

ASD_Rescaled_<rescaling formula>_<element formula>

[Example for a rescalable element](pe_examples_formulas_asap2file.md#rescalable)

See also

[Transformation Formulas](PE_TransformationFormulas.md)

[Examples: Formulas in the ASAM-MCD-2MC File](pe_examples_formulas_asap2file.md)

[Introduction - Rescalable Implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm)

[Generating Application Files](generating_files.md)
