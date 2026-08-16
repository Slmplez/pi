# Examples: Conversion Operations

The conversion operations are used to convert a cont variable and use the result in an addition.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  | Conversion to | Limiters |
| Example 1 | Limited | user-defined |
| Example 2 | Limited | automatic |
| Example 3 | WrapAround | user-defined |
| Example 4 | WrapAround | automatic |

##### Example 1:

outLimit = ( cont.limit(-30000,30000) + limitInt);

This ESDL code converts the cont variable to a limited integer type with min. and max. set to -30000 and 30000.

The generated C code (ANSI-C target, Object Based Controller Implementation code generator) looks as follows:

real64 _t1real64;

sint16 _t1sint16;

sint32 _t1sint32;

/* process: line #1 */

_t1real64 = ((_cont < 0.0) ? (_cont - 0.5) : (_cont + 0.5));

_t1sint16 = ((_t1real64 >= -30000.0) ? (((_t1real64 <= 30000.0) ? (sint16)_t1real64 : 30000)) : -30000);

_t1sint32 = _t1sint16 + _limitInt;

_outLimit = ((_t1sint32 >= -32768) ? (((_t1sint32 <= 32767) ? _t1sint32 : 32767)) : -32768);

##### Example 2:

outLimit2 = ( cont_integerIMPL.limit() + limitInt);

This ESDL code converts the cont variable to a limited integer type; min. and max. are set automatically during code generation.

The generated C code (ANSI-C target, Object Based Controller Implementation code generator) looks as follows:

sint32 _t1sint32;

/* process: line #3 */

_t1sint32 = _cont_integerIMPL + _limitInt;

_outLimit2 = ((_t1sint32 >= -32768) ? (((_t1sint32 <= 32767) ? _t1sint32 : 32767)) : -32768);

##### Example 3:

outWrap = ( cont.wrapAroundUint8(0,200) + wrapAround);

This ESDL code converts the cont variable to a wrap-around integer type with type uint8 and min. and max. set to 0 and 200.

The generated C code (ANSI-C target, Object Based Controller Implementation code generator) looks as follows:

real64 _t1real64;

uint8 _t1uint8;

/* process: line #5 */

_t1real64 = ((_cont < 0.0) ? (_cont - 0.5) : (_cont + 0.5));

_t1uint8 = (uint8)_t1real64 + _wrapAround;

_outWrap = _t1uint8;

##### Example 4:

outWrap2 = (cont.wrapAroundUint8() + wrapAround);

This ESDL code converts the cont variable to a wrap-around integer type with type uint8; min. and max. are set automatically during code generation.

The generated C code (ANSI-C target, Object Based Controller Implementation code generator) looks as follows:

real64 _t1real64;

uint8 _t1uint8;

/* process: line #7 */

_t1real64 = ((_cont < 0.0) ? (_cont - 0.5) : (_cont + 0.5));

_t1uint8 = (uint8)_t1real64 + _wrapAround;

_outWrap2 = _t1uint8;

See also

[Conversion Operations](ESDL_ConversionOperations.md)
