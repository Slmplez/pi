# Implementation Casts in ESDL

Implementation casts (see [Overview - Implementation Casts](IntroductionEnglishUS.chm::/INT_implementation_casts.htm)) are available in ESDL for modules and classes (except CT blocks).

In the specification of an operation in ESDL, implementation casts must be represented by their names. An addition with implementation casts that appears as follows in BDE:

![](ImplCast_ESDL_as_BDE%20copy.gif)

is represented as a function in ESDL as such:

c = cast_3 ( cast_1 (a) + cast_2 (b) );

Here it is important that an implementation cast is written like a method call: it is always placed before the element to which it refers; the element is enclosed in parentheses, like a method argument. If the implementation cast is to be applied to the result of an operation, the entire operation must be enclosed in parentheses.

In the example above, cast_1 refers to variable a, cast_2 to b and cast_3 to the result of the operation a + b.

If intermediate results of arithmetic operations are to be manipulated using an implementation cast, the corresponding intermediate results have to be enclosed in parentheses.

Thus, in this statement:

x = cast_1 ( (cast_2 ( (a + b) * c - d ) ) / e );

cast_2 refers to the intermediate result of the operation,

(a + b) * c - d

while cast_1 changes the overall result of the operation:

((a + b) * c - d) / e

An implementation cast in ESDL always refers to the value in the code that immediately follows the implementation cast.

It is important to note here, that the use of the syntax as described above is limited to implementation casts. The parentheses must contain an existing implementation cast; if you specify a standard type, such as uint8 (a), an error message is displayed.

When using implementation casts, remember that they are not available for use with logical variables. If an implementation cast is applied to a logical variable, the code generator generates an error message.

See also

[Overview - Implementation Casts](IntroductionEnglishUS.chm::/INT_implementation_casts.htm)

[Working with Methods and Processes](esdl_working_with_methods_and_processes.md)

[ESDL Syntax](ESDL_ESDL_Syntax.md)

[Variable Names](ESDL_Variable_Names.md)

[Data Types](ESDL_Data_Types.md)

[Type Conversion](ESDL_Type_Conversion.md)

[Primitive Methods](ESDL_Primitive_Methods.md)
