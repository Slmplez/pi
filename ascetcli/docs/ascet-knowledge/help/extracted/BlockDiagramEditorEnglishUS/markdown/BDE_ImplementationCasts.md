# Implementation Casts in Block Diagrams

In the block diagram editor, implementation casts (see also [Implementation Casts](IntroductionEnglishUS.chm::/INT_implementation_casts.htm)) can be inserted in the same way as all other elements using the relevant button in the button bar (here: ![](button_implcast.gif), ). Once generated, they can be added to the drawing area from the element list by Drag & Drop and can be connected there in the same way as all other elements.

Implementation casts cannot be applied to logical elements. If you connect an implementation cast to a logical element, the connecting line is shown in red to indicate the error.

There are no sequence calls for implementation casts, the correct order is determined from the context by code generation.

In the block diagram editor, there is another very convenient way of adding implementation casts. This is particularly useful for existing arithmetical calculation chains. Using the context menu of the arithmetic operators +, -, *, /, abs and neg you can add implementation casts automatically for all inputs and outputs of the operation by selecting Add Implementation Casts.

See also

[Adding Implementation Casts to Operators Automatically](Addimplementation.md)

[Adding Implementation Casts to a Connection Automatically](Addtoconnect.md)
