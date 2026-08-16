# List of Information Messages

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Information Message |
| IBdl91 | Temporary variable used at block <%1> |
| IIa11 | Interval (physical) mismatch in assignment to <%1> %2 := %3 (will be limited) |
| IIa13 | Interval (implementation) mismatch to <%1> %2 := %3 (will be limited) |
| IIa16 | Increment/decrement operation on <%1> without limitation |
| IIa31 | Arithmetic (%1) operation overflows by %2 bits (will be handled by %3) |
| IIa32 | Expression with %1 bit type on the left hand side will be generated with %1 representable bits (project setting is %2 bits) |
| IIa33 | Expression containing a value with %1 bit type will be generated with %1 representable bits (project setting is %2 bits) |
| IIa63 | Non-linear formula <%1> of <%2> with master set to model may lead to unexpected code. |
| IIle10 | Component "%1" is generated with "Prototype Implementation" specified |
| IIle16 | Remainder is protected against rem-by-0 |
| IIle17 | Division is protected against division-by-0 |
| IIle18 | Division is protected against signed overflow |
| IIle51 | Temporary variable %1 read and written with different system constant conditions |
| IIle76 | Interval of assert operator %1 is not contained in operand interval %2 |
| IIle77 | Operand interval %2 is contained in interval of assert operator %1 |
| IIle78 | Implementation cast %1 without assignment limitation can be replaced by an assert operator with interval %2 |
| ILm1 | Ignored %1 access for element "%2" of type Module due to single instance semantics |
| ILm2 | Ignored pre/post hook specification "%1" for task "%2", since monitoring is disabled |
| IMake1 | Hint: select "%1" in project option "%2" for %3 |
| IMake2 | %1 command requires message usage variant option to be set to %2 instead of %3 --- will be set for code generation |
| IMdl150 | Memory class "%1" specified for %2 should be a const data section (%3) |
| IMdl20 | %1 specification of <%2>: "%3" is "%4" |
| IMdl201 | Deprecated feature: asReference flag is set for element <%1> in C code component. Declare an explicit reference instead! |
| IMdl40 | constant folding - reduced %1 statement to THEN statement |
| IMdl41 | constant folding - reduced %1 statement to ELSE statement |
| IMdl43 | constant folding - reduced %1 statement to EMPTY statement |
| IMdl44 | constant folding - reduced %1 statement to %2 |
| IMdl45 | constant folding - reduced %1 to EMPTY statement |
| IMdl46 | reduced assignment without side effects to EMPTY statement |
| IMdl50 | Sequencing should start with %1, but starts with %2 |
| IMdl51 | Sequencing should have step size %1, but have step size %2 |
| IMdl60 | method argument "%1" with memory class "%2" is not a reference - reset memory class to "Default" |
| IMdl620 | No conversion to intermediate representation for %1 mapping of message "%2" to ECU label "%3" |
| IMdl91 | method local variable <%1> not used in <%2> |
| IMdl92 | method argument <%1> not used in <%2> |
| IMdl93 | method <%1> not used in this project |
| IMdl941 | Variable name "%1" begins with an underscore may lead to name clashes in the generated code |
| IMdl95 | Variable "%1" without implementation got the implementation <%2> |
| IMdl97 | INOUT method argument <%1> has not been assigned at each return point |
| IMdl98 | assignment to INOUT method argument <%1> before its value is read, argument can be set to OUT direction |
| ISm95 | state reset method has no specified body - no code is lost |

See also

[List of Warning Messages](List_of_Warning_Messages.md)

[List of Error Messages](List_of_Error_Messages.md)
