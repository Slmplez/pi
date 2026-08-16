# Properties of Implementation Casts

Depending on the code generation options (see [Project Settings](ProjectEditorEnglishUS.chm::/projectsettings.htm)) for the implementation experiments, implementation casts have the following properties:

- If the maximum bit size that is defined for the project is smaller than 32 bits, the code generation for implementation casts allows the use of a larger bit size. If, however a variable that exceeds the permitted bit size is necessary in the code, an error message is displayed.

With this functionality, implementation casts can be applied within arithmetic chains to specify intermediate results that are outside of the controller's original maximum bit size.

- If an implementation cast is present at the numerator input of a division operator, its implementation overwrites the Allow Double Bit Size for Division Numerators option.
- The output of an implementation cast is of cont model type with the implementation of the implementation cast.

This means that an implementation cast can be used to convert arithmetic types to cont type.

Another important property of the implementation cast is that it allocates for its implementation during code generation neither permanent nor temporary memory. This is because implementation casts are not created as global elements or as local function variables. For implementation casts that are applied in combination with a value limitation, however, a local, temporary function variable can be necessary to temporarily store the calculation result before area check is carried out.

The use of implementation cast is limited to the block diagram editor and the ESDL editor. Furthermore, these elements are only offered for modules and classes (excluding, however, CT blocks, Boolean tables and condition tables) and for specifying conditions and actions in state machines.

See also

[Overview - Implementation Casts](int_overview_implementation_casts.md)

[Example: Implementation Casts](INT_Example__Implementation_Casts.md)

[Project Settings - Integer Arithmetic Node](ProjectEditorEnglishUS.chm::/fixedpoint.htm)
