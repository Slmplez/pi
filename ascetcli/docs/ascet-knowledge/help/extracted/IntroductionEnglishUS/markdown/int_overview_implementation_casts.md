# Overview - Implementation Casts

ASCET 5.0 introduced a new primitive element type – the implementation cast. Implementation casts provide the user with the ability to influence the implementation of intermediate results within arithmetic chains. This allow the user to display knowledge regarding particular physical correlations (for example, that a specific range of values is not exceeded at a defined point in the model) in the model, without requiring the allocation of physical memory.

Implementation casts cannot be used in conjunction with logical elements.

Here is a small example to illustrate this functionality: [Example: Implementation Casts](INT_Example__Implementation_Casts.md)

Another application for implementation casts is the targeted allocation of implementations to the inputs and outputs of operators. This function allows you to select target arithmetic services; see [Overview - Arithmetic Services](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm) for specific operators. In this context, implementation casts replace the present operator implementations.

As the name implies, implementation casts only affect the implementation. More accurately, this means that implementation casts are taken into account for the code generation of experiments (see [Project Settings](ProjectEditorEnglishUS.chm::/projectsettings.htm)) of these types:

- implementation experiment and
- object based controller implementation

They are simply ignored for these types:

- physical experiment and
- quantized physical experiment

See also

[Example: Implementation Casts](INT_Example__Implementation_Casts.md)

[Properties of Implementation Casts](INT_Properties_of_Implementation_Casts.md)

[Overview - Arithmetic Services](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)

[Project Settings](ProjectEditorEnglishUS.chm::/projectsettings.htm)
