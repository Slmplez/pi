# Making Arrays Available for Usage in External C Code

Using the macro

ASD_USE_ARRAY_EXTERNAL(array)

array access can be converted from the ASCET internal representation to the standard C code representation. The macro is a synonym for:

&array[0]

Example:

y = c_function(ASD_USE_ARRAY_EXTERNAL(array));

See also

[Overview - Access Macros](CC_Overview_-_Access_Macros.md)

[Direct Access](CC_Direct_Acess.md)

[Length of Arrays](CC_Length_of_Arrays.md)

[Resource Access](CC_Resource_Access.md)

[Access to Private Methods](CC_Acess_to_Private_Methods.md)
