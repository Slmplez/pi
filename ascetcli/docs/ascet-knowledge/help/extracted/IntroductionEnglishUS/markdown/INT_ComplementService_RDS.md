# Complement Services for Redundant Data Storage

Special arithmetic services, the complement service, are required to compute the complement representation of an element marked as redundant.

The complement services must be added manually to the respective services.ini file; the AS editor does not support complement services.

| Column 1 |
| --- |
| NOTICE |
| When you edit a services.ini file with complement service in the AS editor, and then save the changes, the complement service definition is converted to a comment. Projects that use the complement service will no longer compile. Do not edit a services.ini file with complement service in the AS editor. |

Complement services are defined in services.ini as other arithmetic services (see [Defining Arithmetic Services](ArithmeticServicesEnglishUS.chm::/AS_Def_Arith_Serv_.htm) and references therein):

complement|<operand type>[|<result type>]=function

<operand type> is the type of the original, <result type> is the type of the complement.

<result type> must be an integer type, i.e. u8, u16, u32, s8, s16, or s32. If you specify a float type or a wildcard, one of the following error messages is issued during code generation:

ERROR (MIle23) Float types can not be used as redundant data types, see "complement|<operand type>|r<*>" in file "<path>\services.ini"

ERROR (MIle24) Unknown type used as redundant data type, see "complement|<operand type>|<result type>" in file "<path>\services.ini"

If you omit <result type>, the type of the complement is determined automatically according to the following table:

| Column 1 | Column 2 |
| --- | --- |
| original type | complement type |
| s8, u8 | u8 |
| s16, u16 | u16 |
| s32, u32 | u32 |
| everything else | u32 |

In that case, a warning of type WIle201 is issued during code generation.

Example for a complement service entry in services.ini:

complement|s16|s16=complement_%t1%(%i1%)

If no suitable complement service is available, the following error message is issued during code generation with redundant data storage:

ERROR (MIle20): Arithmetic service <name> is required but not defined

If multiple redundant services are defined which differ only in <result type>, the following error is issued:

ERROR (MIle22): Multiple complement services for type "<operand type>" defined in file "<path>\services.ini"

See also

[Redundant Data Storage](INT_RedundantDataStorage.md)

[Defining Arithmetic Services](ArithmeticServicesEnglishUS.chm::/AS_Def_Arith_Serv_.htm)
