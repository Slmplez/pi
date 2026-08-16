# Methods

The functional description of a software model in ESDL is contained in methods. The methods perform calculations and manipulate data. They are invoked (or called) as operations on objects.

A method call has the general form

receiverClassName.doSomething(parameterList)

where receiverClassName is the name of the receiver object, which ’executes’ the doSomething method. Parameters can be passed on as either a comma-separated list or a single parameter in the parameterList. Any expression can be a parameter, including method calls.

The following are valid method calls in ESDL.

If a method has no parameters, the parentheses at the end of the method name still have to be supplied for the statement to be interpreted as a method call.

loader.resolve(false, 1.76); //do not use characteristic, calculate value for 1.76

numbers.setAt(10*index, index); //set array numbers to 10*index at index

(12.4)between(valA, valB); //check if 12 is between valA and valB

array.length(); //return array length

Access to the length of an array or matrix via length() is not supported for microcontroller targets.

See also

[Methods with a Return Value](ESDL_Methods_with_a_Return_Value.md)

[Nested Methods](ESDL_Nested_Methods.md)

[This](this.md)

[Access Control](esdl_access_control.md)

[Direct Access Methods](ESDL_Direct_Access_Methods.md)

[Primitive Methods](ESDL_Primitive_Methods.md)

[Conversion of Methods or Processes](BlockDiagramEditorEnglishUS.chm::/BDE_Conversion_MethodsProcesses.htm)
