# Defining Arithmetic Services

Arithmetic services consist of two parts: the definition of the service call and the preparation of the function code. While the function code does not have to follow any hard rules except that it must be valid C code, which has to be provided to ASCET (see [External Source editor](CCodeEditorEnglishUS.chm::/using_external_source.htm)), the definition of these service calls must be of a form that can be understood by ASCET. The definition of the service call for an arithmetic service follows a strict syntax:

operation|opType1|opType2|opType3|resType=function

Every definition consists of two parts:

- Function key

- operation|opType1|opType2|opType3|resType

- Function call in C syntax

- function

The function key serves to unambiguously assign a standard operation to an arithmetic service. The function call exactly represents the function call to be used by the code generator.

Every theoretically possible standard operation is to be described by exactly one key, and there can be only one defined service per key.

See also

[External Source Editor](CCodeEditorEnglishUS.chm::/using_external_source.htm)

[Function Key](AS_Function_Key.md)

[Allowable Arithmetic Services](AS_Allowable_Arithmetic_Services.md)

[Allowable Types](AS_Allowable_Types.md)

[Function Declaration](AS_Function_Declaration.md)
