1. AUTOSAR package name must consist at least of subpackage and short name - please correct AUTOSAR package name "/package" of SenderReceiver_InterfaceType

1. ISR source "Level2" not declared

1. redundant data flag is set for <message>, but redundant data and mapped messages cannot be combined.

1. could not recognize [integer]literal: <number>, because: Result too large line <line_nr> pos: <cursor position>.

# List of Error Messages

The list of ASCET error messages is split in several parts.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| List of Error Messages, Part 1 : E* |  | List of Error Messages, Part 5 : MM* |
| List of Error Messages, Part 2 : F* |  | List of Error Messages, Part 6 ; MS* |
| List of Error Messages, Part 3 : G* |  | List of Error Messages, Part 7 : R* |
| List of Error Messages, Part 4 : MB* - ML* |  | List of Error Messages, Part 8 : Y* |

##### Part 1: E*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| ECCg0 | %1 |
| ECCg10 | Characteristic table/distribution must be parameter <%1> |
| ECCg11 | Separate "search"/"interpolate" functions of characteristic tables are not supported. Please use "getAt" function instead. |
| ECCg12 | Distribution of fixed characteristic <%1> must be regular. |
| ECCg13 | Bit types are not supported for instance variables of classes: <%1> |
| ECCg41 | Memory class <%1> specified for %2 is not declared in file "memorySections.xml" - Please add declaration |
| ECCg9 | (CodeGenerator) Element <%1>: size of values (%2) exceed size of type (%3) |
| ECg1 | logic has semantic errors; should not be able to generate Code |
| ECg2 | Invalid %1 path name: %2 |
| ECg5 | %1 "%2", used as SHORT-NAME tag in AUTOSAR XML generation, must not %3 |
| ECg84 | Invalid template parameter(s) "%1" used for symbol "%2" |
| ECg85 | "%1" is not a valid ANSIC identifier --- check symbol template "%2" |
| EIa1 | Code Generation (internal) - %2 |
| EIa2 | Code Generation - %2. Try smaller intervals or larger quantizations |
| EIa21 | dT implementation not representable - Try larger interval or smaller quantization (e.g. 0.001) |
| EIa3 | Interval %1 does not fit in a valid integer type, with respect to option "maximum bit length" |
| EMake10 | Cannot generate code because of a cyclic dependency of components in sub graph %1 |
| EMake20 | Class names are not unique in project: %1 |
| EMake21 | Class %1 has parameters, so all instances must have the same data set |
| EMake22 | Interpolation scheme must be the same in all instances of "%1" for element named "%2" |
| EMake220 | %3 %1 (original value %2) not found for interpolation %4 |
| EMake221 | %1 is empty for interpolation %2 |
| EMake222 | Invalid interpolation mapping because of flag "%1" |
| EMake223 | Alias interpolation "%1" is not mapped |
| EMake23 | Cannot use experimental expander for controller code generation |
| EMake24 | Object Based Controller Implementation can only be used together with an ASCET-SE target |
| EMake240 | Object Based Controller Physical can only be used together with the EHooks target supporting at least EHooks tool V3.0.0 |
| EMake25 | Cannot use experimental code generation with controller target |
| EMake26 | Generation of operating system configuration is required using experimental targets - please activate appropriate Build option |
| EMake27 | Cannot create exported element "%2" due to multiple implementations of component "%1" |
| EMake30 | Names of datasets (%1) used in current project are not unique for component "%2" |
| EMake31 | Dataset and implementation must be identical for all instances of Module "%1" |
| EMake32 | Missing implementation set for component "%1 |
| EMake33 | Missing %1 set for element "%2" in component "%3" |
| EMake41 | Module "%1" should be instantiated only once, due to single instance semantics |
| EMake42 | Only one %1 can be used in an ASCET project |
| EMake43 | AUTOSAR use case requires one instance of a %1 to be used in an ASCET project |
| EMake50 | Multiple defined conversion name "%1" - used as formula as well as enumeration name |
| EMake51 | "%1" instances can only be used in %2 components |
| EMake52 | Instances of %1 components must not be used in %2 components |
| EMake60 | Target type "%1" not unique, used in multiple declaration files: %2 |
| EMake61 | Memory segment ID "%1" not unique, used in multiple declarations |
| EMake610 | Target %1 does not support %2 - please change option or target |
| EMake611 | Unsupported value "%3" for target %1 related option "%2" - please change option |
| EMake62 | Memory segment ID "%1" is reserved for internal use |
| EMake63 | Memory segment ID "%1" contains invalid characters |
| EMake64 | Memory segment priority "%1" is not unique |
| EMake65 | Unknown Memory segment ID "%1" used to define a default memory class |
| EMake66 | Memory segment label "%1" not unique |
| EMake67 | Unreadable read costs for memory section <%1> -- see memorySections.xml in your target directory |
| EMake70 | Invalid OS specification - task list must not be empty |
| EMake80 | Component prefix "%1" is no valid ANSI C identifier; see project options |
| EMake81 | Component name "%1" is no valid ANSI C identifier |
| EMake82 | AUTOSAR SW Component name "%1" is reserved within AUTOSAR tool chain - please change |
| EMake90 | Invalid template "%2" - %1 |
| EOS1 | no operating modes specified |
| EOS3 | illegal identifier <%1> for task - must be compliant with ANSI C |
| EOS4 | Operating system %1 is not supported for target %2 |

[back to top](#Top)

##### Part 2: F*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| FCg0 | %1 |
| FCg1 | %1: expected %2 |
| FCg12 | GENERAL: missing error message |
| FCg2 | incorrectly built syntax tree |
| FCG3 | invalid method call |
| FCg4 | %1: missing keyword |
| FCg42 | %1: unknown operator |
| FCg43 | %1: still elements on stack |
| FCg5 | GENERAL: no class named <%1> |
| FCg6 | GENERAL: not yet implemented |
| FCg7 | GENERAL: stack empty |
| FCg71 | GENERAL: stack full |
| FCg81 | invalid OS expander type: %1 |
| FCg811 | invalid Init expander type: %1 |
| FCg82 | value of Macro %1 must be boolean (true,false,0 or 1) |
| FCg83 | undefined Macro: %1 |
| FCg84 | invalid value %2 of Macro: %1 |
| FCg85 | undefined Template: %1 |
| FCg86 | undefined value in compiler declaration file: %1 |
| FCg9 | temporary variables management error for <%1> |
| FIle9980 | Internal error |
| FIle9981 | Internal error |
| FIle9982 | Internal error |
| FIle9983 | Internal error |
| FIle9984 | Internal error |
| FIle9985 | Internal error |
| FIle9986 | Internal error |
| FIle9987 | Internal error |
| FIle9988 | Internal error |
| FIle9989 | Internal error |
| FIle9990 | Internal error |
| FIle9991 | Internal error |
| FIle9982 | Internal error |
| FIle9993 | Internal error |
| FIle9994 | Internal error |
| FIle9995 | Internal error |
| FIle9996 | Internal error |
| FIle9997 | Internal error |
| FIle9998 | Internal error |
| FIle9999 | Internal error |

[back to top](#Top)

##### Part 3: G*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| GLm1 | during %1 |
| GLm2 | %1: could not open file <%2> |
| GLm21 | %1: %2 |
| GLm3 | Reference init value not defined or not available. Please specify an internal init value for <%1>. |
| GLm4 | Undefined init value for reference <%1>. |
| GLm5 | Init value <%1> of reference <%2> must be in the same component. |
| GLm6 | found broken connection (red line) -- please delete and redraw if needed |

[back to top](#Top)

##### Part 4: MB* - ML*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| MBdl7 | unbalanced number of start/stop atomic in <%1> |
| MBdl71 | atomic sequence must begin with start atomic in <%1> |
| MCCg1 | Assignment to a complex variable <%1> is not allowed for controller target |
| MCCg11 | Assignment to a complex variable <%1> is not allowed, if "asReference" is not specified |
| MCCg3 | %2 <%1>: %3 not supported for controller targets |
| MCg11 | identifier <%1> already declared - used as keyword |
| MCg2 | identifier <%1> not declared |
| MCg21 | class <%1> not declared |
| MCg22 | method <%1> not declared |
| MCg3 | identifier <%1> already declared in scope <%2> |
| MCg4 | identifier <%1> not declared in scope <%2> |
| MCg5 | type mismatch between <%1> and <%2> |
| MCg6 | type mismatch: expected <%1>, got <%2> |
| MCg61 | type mismatch: expected <log> got <%1> |
| MCg62 | type mismatch: expected scalar type, got <%1> |
| MCg7 | wrong number of arguments for call of <%1> |
| MCg8 | macro on stack is not an expr |
| MCg81 | macro on stack is an expr |
| MCta33 | %1 access to %2 <%3> in method <%4> denied |
| MCta40 | reuse of derivative <%1> in argument not allowed |
| MCta45 | derivative call can only be used with states |
| MCta50 | put direct link statement into <directOutputs> method |
| MCta51 | put nondirect link statement into <nondirectOutputs> method |
| MCta52 | output <%1> is assigned direct and nondirect |
| MCta60 | missing declaration of variable <%1> in element's list |
| MCta66 | do not call function <%1> in method <%2> |
| MIa1 | Cannot generate fixed point code for the non-linear formula <%1> of <%2> |
| MIa10 | assignment: invalid specification (<Limit Assignment : TRUE>) at element "%1", due to usage as running variable in FOR stmnt |
| MIa11 | overflow detection: invalid specification (<%1> and <%2>) at element "%3", due to %4 |
| MIa12 | limited assignment of value %1 to <%2> is out of implementation interval %3 |
| MIa13 | limited assignment of <%1> to <%2> not possible without overflow limitation due to value range of <%3> exceeding maximum bit length of target |
| MIa14 | limited assignment of <%1> to interval <%2> not possible without overflow limitation due to value range of <%3> exceeding maximum bit length of target |
| MIa15 | Cannot assign <%2> to INOUT parameter <%1> because of different implementations |
| MIa2 | Implementation interval %1 of <%2> too large for implementation type |
| MIa21 | Modulus must be greater than 1, but is %1 |
| MIa3 | Physical interval %1 of divisor contains zero. |
| MIa4 | Implementation type of <%1> is too large. |
| MIa5 | Cannot mix floating point and fixed point values. |
| MIa50 | Rescalable element <%1> must be of type cont, but is of type %2 |
| MIa501 | %1 element <%2> must not have a rescalable %3 |
| MIa51 | Rescalable element <%1> must have local scope, but is %2 |
| MIa52 | Rescalable element <%1> must have a linear formula with zero offset, but formula is %2 |
| MIa53 | Rescalable element <%1> must have an integer implementation type, but the implementation is %2 |
| MIa54 | Rescalable element <%1> must have master set to implementation, but is set to model |
| MIa55 | Element <%1> cannot be rescalable due to %2 |
| MIa6 | Cannot assign %1 reference from <%3> to <%2> because of different implementations |
| MIa61 | Cannot determine implementation of method local variable %1, because the right hand side does not have an implementation |
| MIa7 | Expander <%1> does not support float type of <%2> |
| MIa8 | Implementation interval of <%1> is empty. |
| MIa9 | scale must be non negative |
| MIle1 | <%1> is not a valid ANSIC identifier |
| MIle100 | Duplicate C-Code name "%1" for component types - either change name or associated naming template |
| MIle101 | Duplicate C-Code name "%1" for exported elements - either change name or associated naming template |
| MIle11 | A BDE-Case operator is not allowed in the condition of a while loop |
| MIle12 | "%1" is not a valid ANSIC identifier --- check template "%2" |
| MIle13 | An explicit read or write with status handler is not allowed in the condition of a while loop |
| MIle2 | use of reserved name <%1> --- please change it |
| MIle20 | Arithmetic service <%1> required but not defined |
| MIle21 | Interpolation service <%1> required but not defined |
| MIle22 | Multiple complement services for type "%1" defined in file "%2" |
| MIle23 | Float types can not be used as redundant data types, see "%1" in file "%2" |
| MIle24 | Unknown type used as redundant data type, see "%1" in file "%2" |
| MIle3 | invalid template <%1> for key %2 --- unknown argument %%%3%% |
| MIle301 | invalid template <%1> for key %2 --- odd number of "%%" or "?" symbols |
| MIle33 | interval of service argument %1 is not representable. |
| MIle4 | interval %1 does not fit in a valid integer type, with respect to option "maximum bit length" |
| MIle41 | Limitation is missing on assignment |
| MIle5 | Using message "%1" in method "%2" with code generation option messageUsageVariant=NON_OPT_COPY is not supported |
| MIle60 | not supported type combination for oneDInterpolation: expected cont/cont (float/float) or disc/disc (int/int) respectively |
| MIle61 | not supported type combination for twoDInterpolation: expected cont/cont/cont (float/float/float) or disc/disc/disc (int/int/int) respectively |
| MIle7 | wrong OS specification with respect to <numHWLevels> entry in target.ini (specified <%1>, calculated <%2>) |
| MIle76 | Interval of assert operator %1 and operand interval %2 have no common values |
| MIle77 | index <%1> out of bounds for indexed expression "%2" |
| MIle8 | invalid compile time constant expression - floating point constant detected |
| MIle9 | division by zero detected |
| MIle91 | implementation interval %1 of denominator represents zero |
| MIle92 | Cannot convert an expression the negative values %1 to a modular type |
| MIle93 | F-Division is not supported for operand %1 of type %2 |
| MIle94 | Cannot choose a limit interval for floating point expressions |
| MIle9993 | Casting leads to overflow on %1 bits targets |
| MLm10 | need export or mapping for imported element <%1> with type <%2> |
| MLm11 | missing component type for <%1> |
| MLm12 | missing name for implementation type of element "%1" |
| MLm14 | implementation type "%1" of element "%2" undefined in current project |
| MLm15 | Invalid specification for "Limit to maximum bit length" at element <%1> |
| MLm2 | multiple export of <%1> in all of <%2> |
| MLm20 | both export <%1> and import <%2> must be of kind <%3> |
| MLm21 | both export <%1> and import <%2> must have identical %3 |
| MLm22 | multiple export of "%1" |
| MLm23 | multiple mapping of "%1" %2 all of (%3) --- %4 |
| MLm3 | <%1>: data types other than real are currently not supported |
| MLm302 | <%1> - due to %2 - can not be used as reference |
| MLm4 | missing %1-distribution for group char table <%2> --- possibly deleted |
| MLm41 | missing %1-distribution for group char table <%2> |
| MLm42 | expected %1-distribution for group char table <%2> to be exported |
| MLm43 | Distribution %1 without group char table |
| MLm44 | Inconsistent interpolation on group char tables for distribution %1 |
| MLm50 | could not find file <%1> |
| MLm60 | actual dependent parameter missing for formal parameter <%1> of element <%2> |
| MLm61 | dependent parameter formula missing for element <%1> |
| MLm70 | imported type <%1> and exported type <%2> different for element <%3> |
| MLm80 | must not start model element "%1" with ASCET namespace prefix "%2" |
| MLm81 | method name "builtInStateReset" not allowed in state machines |
| MLm90 | formula named "%1" used for item <%2> not known in current project --- please create formula; hint: use "Global Formulas - Add missing" menu |
| MLm901 | rescaling formula named "%1" used for item <%2> must be linear |
| MLm902 | rescaling formula named "%1" used for item <%2> must have a zero offset |
| MLm903 | rescaling formula named "%1" used for item <%2> must have a positive scale |
| MLm91 | formula name used for item <%1> is empty --- please specify valid formula name |
| MLm92 | formula named "%1" does not comply with ASAM-2MC --- please rename formula; hint: use "Extras - Global Replace Formula" menu |

[back to top](#Top)

##### Part 5: MM*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| MMdl0 | statements not allowed here |
| MMdl1 | %1 identifier "%2" already declared |
| MMdl10 | %1 - please %2 Examples |
| MMdl100 | priority of task "%1"%2 must be in interval %3 |
| MMdl101 | min period (%1s) for interrupt "%2" must not be smaller than minimum task cycle time (%3s) specified for target |
| MMdl102 | specified deadline (%1s) of task "%2" may not exceed specified period (%3s) |
| MMdl103 | OUT method argument "%1" can not be read; you may declare it as INOUT |
| MMdl104 | <%1> - due to %2 - is not a lvalue and can not be used with a OUT/INOUT method argument |
| MMdl105 | <%1> - due to %2 - can not be used as method argument |
| MMdl106 | Element "%1" of provide port "%2" can not be read |
| MMdl107 | Element "%1" of require port "%2" can not be written |
| MMdl108 | <%1> - due to %2 - can not be used as OUT method argument |
| MMdl11 | can not declare %2 "%1" - used as reserved word |
| MMdl110 | internal method (macro) "%1" of type "%2" must not be called from C code component |
| MMdl111 | usage of "%1" variable not supported in code generation for AUTOSAR |
| MMdl112 | Access operators cannot be cascaded |
| MMdl113 | An access operator can only be applied to a require or provide port, except for client server interface ports |
| MMdl1131 | An invoke operator can only be applied to a client server interface port |
| MMdl114 | An explicit write must be assigned to a variable, array element or record field |
| MMdl115 | No mode defined for mode switch event "%1" |
| MMdl116 | %1 is not allowed in arithmetic context |
| MMdl117 | %1 RTE calls cannot be used in methods that are not called from a runnable |
| MMdl1171 | %1 cannot be used in method "%2" (called from runnable "%3") with no timing event associated |
| MMdl1172 | %1 cannot be used in runnable "%2" with no timing event associated |
| MMdl118 | %1 RTE calls cannot be used in methods that are called from more than one runnable |
| MMdl119 | %1 access to a record element cannot be explicit |
| MMdl1191 | RTE status variable may reference multiple status returns |
| MMdl1192 | RTE status variable is not initialized |
| MMdl12 | %1 "%2" already declared |
| MMdl120 | expression does not have an effect |
| MMdl121 | INOUT argument "%1" and actual value "%2" must have same implementation because of reference semantics |
| MMdl122 | No %1 defined for %2 event "%3" |
| MMdl123 | Element "%1" can not be used with copy semantics, since its type "%2" forces reference semantics |
| MMdl124 | Timing Event "%1" has period of zero |
| MMdl1281 | AUTOSAR component requires an operation invoked event to be specified for each operation represented by provide port "%1" - Please add event |
| MMdl1282 | %3 mismatch between ClientServer operation "%2" and associated runnable "%1" |
| MMdl1283 | %4 mismatch of argument "%1" between ClientServer operation "%2" and associated runnable "%3" |
| MMdl1285 | AUTOSAR provide port "%1" must not be used as calibration interface, only require port allowed |
| MMdl1286 | Invalid value (%1) for enum label "%2" of %3. Values must be in range of an implementation type. |
| MMdl1287 | Wrong value (%1) for application error "%2" defined for ClientServer interface "%3". AUTOSAR restricts values to be in range 2...63. |
| MMdl1288 | Multiple enumeration types (%1) used as application errors in ClientServer interface "%2". Please restrict to one. |
| MMdl1289 | Value range ([%1,%2]) of %3 too large to fit an implementation type |
| MMdl1290 | Multiple %1 ("%2") used in %3 |
| MMdl14 | application mode id "%1" already declared |
| MMdl140 | operator "%1" not supported |
| MMdl15 | identifier "%1" not declared in project "%2" |
| MMdl150 | Memory class "%1" specified for %2 is not declared in file "%3memorySections.xml" - Please add declaration |
| MMdl16 | missing export of variable "%1" |
| MMdl160 | missing %1 of %2 "%3" |
| MMdl161 | Both export and import of "%1" must have memory attribute "%2" |
| MMdl17 | methodname "%1" already declared - used as access methodname |
| MMdl170 | %1 "%2" already declared --- %3 |
| MMdl18 | element name "%1" already declared - used in "%2" |
| MMdl180 | element name "%1" of %2 already declared - used in %3 |
| MMdl19 | multiple usage of enum value "%1" - used in "%2" and "%3" |
| MMdl190 | multiple usage of constant value "%1" in switch statement |
| MMdl20 | %1 "%2" not declared %3 Examples |
| MMdl201 | Method call argument "%2" used multiple times with OUT or INOUT direction in "%1", values overwrite each other |
| MMdl21 | class "%1" not declared |
| MMdl22 | method "%1" not defined as public in class "%2" |
| MMdl23 | method "%1" not available for enumerations |
| MMdl25 | last operation of "%1" must be return statement |
| MMdl26 | unknown attribute <%1> for identifier "%2" |
| MMdl27 | unknown class <%1> for identifier "%2" |
| MMdl270 | Invalid access to message "%1" %2 - missing or invalid message mapping |
| MMdl271 | Invalid %1 mapping for element "%2" in "%3" - mapping to %4 supported only |
| MMdl272 | Invalid %1 to message "%2" in "%3" - missing internal mapping to %4 |
| MMdl273 | Invalid %1 to message "%2" in "%3" - message acccess in c-code component not supported in AUTOSAR context |
| MMdl274 | Multiple mapping of "%1" to all of (%2) --- %3 |
| MMdl28 | call to process "%1" not allowed - use OS specification to activate process |
| MMdl280 | call to runnable "%1" not allowed - use AUTOSAR means to activate runnable |
| MMdl281 | AUTOSAR release 4x requires elements of SENDER-RECEIVER-INTERFACE "%1" to be either all mode groups or all non mode groups |
| MMdl282 | AUTOSAR attribute "%1" has invalid value (%2) for element "%3" of kind %4 |
| MMdl283 | Invalid settings of AUTOSAR attributes for element "%1": %2="%3" and %4="%5" not supported |
| MMdl284 | Explicit %1 access to SenderReceiver element "%2" due to %3 attribute set to "%4" not supported |
| MMdl285 | Invalid %1 access to "%2" due to %3 attribute set to "%4" |
| MMdl286 | AUTOSAR release 4x restricts number of elements in MODE-SWITCH-INTERFACE "%1" to 1 |
| MMdl287 | AUTOSAR release %1 does not support %2 |
| MMdl288 | Invalid explicit access (%1) to IRV "%2" specified as implicit |
| MMdl289 | Identical RTE macro name ("%1") for multiple runnables (%2) - please change naming |
| MMdl29 | need at least one cooperative level when specifying software tasks |
| MMdl290 | prio for <%1> exceeds prio levels |
| MMdl291 | %1 preemptive priority levels exceed maximum of %2 |
| MMdl292 | %1 cooperative priority levels exceed maximum of %2 |
| MMdl293 | %1 software priority levels (cooperative + preemptive) exceed maximum of %2 |
| MMdl3 | <%1> - due to %2 - is not a left value for assignment |
| MMdl30 | <%1> - due to %2 - is not a left value for increment/decrement operation |
| MMdl300 | <%1> - due to %2 - is not an expr to be used for call-by-reference semantics |
| MMdl3000 | <%1> - due to %2 - is not allowed to have set method |
| MMdl301 | cannot assign %1 element <%2> to %3 element <%4> |
| MMdl302 | <%1> - due to %2 can not be used as reference |
| MMdl3021 | Reference element <%1> must have read or write access |
| MMdl3022 | Reference element <%1> must have read and write access |
| MMdl3023 | Cannot use the address of a stack object %1 |
| MMdl3024 | Cannot use the address of a message object %1 |
| MMdl303 | cannot initialize reference <%1> with reference <%2> |
| MMdl304 | cannot initialize reference <%1> with implicit reference <%2> |
| MMdl305 | cannot initialize %3 reference <%4> with %1 element <%2> |
| MMdl306 | cannot assign to non-write reference <%1> |
| MMdl307 | <%1> - due to %2 - is not a left value for compound assignment %3 |
| MMdl308 | illegal return value in "%1" - due to %2 |
| MMdl309 | cannot initialize <%1> with zero, because element is specified as ZERO NOT INCLUDED |
| MMdl31 | application modes missing for task "%1" |
| MMdl310 | application mode "%1" is assigned to several init tasks: %2 --- only one init task per application mode is allowed |
| MMdl32 | init task "%1" contains not unique assignments to application modes %2 |
| MMdl33 | illegal use of virtual element "%1" - may not be used in specification |
| MMdl340 | Name of %1 ("%2") matches OIL keyword - please change |
| MMdl341 | Name of %1 ("%2") matches reserved name - please change |
| MMdl342 | Name of %1 ("%2") matches %3 - please change |
| MMdl345 | Process "%1" of module "%2" cannot be assigned to a task/ISR and an init task (%3) |
| MMdl351 | operating system specification must not be empty with option message usage variant set to %1 |
| MMdl352 | process %1 must not be assigned to multiple tasks with option message usage variant set to %2 |
| MMdl353 | method %1 must not be called from different tasks with option message usage variant set to %2 |
| MMdl355 | method %1 must not use messages with option message copy variant set to "%2" |
| MMdl356 | process %1 is used in task %2 and can there not be inlined |
| MMdl36 | Discrete type cannot be converted to modular or limited: %1 |
| MMdl37 | redundant data flag is set for %1, but %2 Examples |
| MMdl371 | verify operator can only be used on model identifier with redundant flag set |
| MMdl372 | redundant arrays/matrices <%1> can not be assigned to references <%2> with write-to-referenced-element flag |
| MMdl4 | invalid initial value for blocklocal variable "%1" |
| MMdl41 | wrong dimension of init value for <%1> - check maxSize |
| MMdl42 | wrong %1-dimension of init value for <%2> - check %1-maxSize |
| MMdl43 | can''''t init global reference <%1> with local instance <%2>; use a global init value instead |
| MMdl44 | init value <%1> of non modifiable element "%2" does not match specified physical interval %3 of selected implementation |
| MMdl45 | wrong init value for enumerated element "%1" --- label "%2" not found in enum type "%3" |
| MMdl451 | Dependent parameter "%1" of type "%2" currently not supported. |
| MMdl46 | init value for rescalable element "%1" must be 0 |
| MMdl47 | Implementation of instance <%1> of rescalable component <%2> must have a rescaling formula |
| MMdl471 | Rescalable element <%1> is not allowed in project |
| MMdl48 | constant folding: generated endless loop --- please change specification of %1 |
| MMdl490 | No dispatch point is connected to any bypass function |
| MMdl491 | Local messages are not supported by selected EHOOKS tool, but accessed in bypass function "%1" (%2) --- please use more recent version of EHOOKS-DEV |
| MMdl5 | n-dimensional arrays in <%1> not supported |
| MMdl50 | expected at least one element in %1 specification <%2> |
| MMdl500 | expected expression for argument, got statement |
| MMdl501 | element <%1> (no reference flag) uses external %2 which does not contain at least one element |
| MMdl502 | external %1 contains element <%2> of type %3 which should match the specification with respect to "external struct" |
| MMdl503 | element "%2" has type "%1" with external declaration which is currently not supported for %3 generation |
| MMdl51 | expected type <matrix> (<%1>) for two-dimensional access |
| MMdl510 | %1 with external struct/typedef should be defined with user-defined order |
| MMdl52 | expected type <array> (<%1>) for one-dimensional access |
| MMdl53 | expected return value for method |
| MMdl54 | illegal use of label <%1> |
| MMdl55 | implementation type <Bit> currently not supported for complex class type |
| MMdl551 | Method argument <%1> must have an implementation, but does not |
| MMdl552 | Method return of <%1> must have an implementation, but does not |
| MMdl56 | multiple defined enum value <%1> |
| MMdl560 | Multiple defined conversion name "%1" - used as formula as well as enumeration name |
| MMdl561 | multiple defined label "%1" - as enum value of %2 and label in specification of %3 |
| MMdl562 | name clash: multiple defined label "%1" as "%2" and "%3" |
| MMdl563 | ambiguous reference to element "%1" |
| MMdl57 | name clash in "%1": elements with GET() access enabled, should not start with "SET" |
| MMdl6 | type mismatch: expected <%1> (<%2>), got <%3> (<%4>) |
| MMdl60 | type mismatch: expected <%1>, got <%2> |
| MMdl600 | type mismatch for oneDInterpolation (%1): expected cont/cont or disc/disc combination |
| MMdl601 | type mismatch for twoDInterpolation (%1): expected cont/cont/cont or disc/disc/disc combination |
| MMdl602 | mismatch of interpolation: %1 and %2 |
| MMdl603 | Undefined interpolation %1 |
| MMdl604 | Char tables cannot have optimized data structures in the experiment |
| MMdl605 | type mismatch for method call ("%1"): expected return value |
| MMdl606 | type mismatch for method call ("%1"): expected VOID method, i.e. no return value |
| MMdl607 | cannot return %1 element <%2> from %3 return of method <%4> |
| MMdl608 | Char tables with optimized data structures are not supported by SCOOP-IX |
| MMdl609 | Double precision char tables are not allowed for value implementation type uint32/sint32/real64 |
| MMdl610 | type mismatch: selected implementation type <%1> is not suited for %2 "%3" and can not be used |
| MMdl62 | type mismatch: expected <cont> or <disc>, got <%1> |
| MMdl620 | cannot assign complex type to blocklocal variable "%1" without implementation |
| MMdl621 | illegal implementation type "%1" used for model type "%2" at element "%3" |
| MMdl622 | Operand <%1> of pre/post inc/decrement must not be rescalable |
| MMdl623 | Operation %1 is not supported for non-linear formula %2 |
| MMdl63 | type mismatch: expected <disc>, got <%1> |
| MMdl630 | either both or none of blocklocal variable "%1" without implementation and its assignment expression must be enumeration |
| MMdl631 | type mismatch: expected numerical type, got %1 |
| MMdl632 | type mismatch: at most one operand must be rescalable for operation <mul> |
| MMdl633 | type mismatch: the numerator must be rescalable if the denominator is rescalable for operation <div> |
| MMdl635 | non identical types in %1 mapping for "%2" (defined in "%3") - %4: expected <%5>, got <%6> |
| MMdl636 | multiple elements are mapped to %1, but only one allowed |
| MMdl639 | illegal type for input or output "%1" of %2 component - use struct (i.e. class component with no methods) or record instead |
| MMdl64 | type mismatch: type <%1> is not indexable |
| MMdl640 | illegal type for method "%1" - Module components may not be used as return type due to the single instance semantics of Modules |
| MMdl641 | illegal type for argument "%1" - Module components may not be used as type for arguments of Class methods |
| MMdl642 | illegal type %2 for record element "%1" - Record elements may only be of type cont, limited, wrap around, sdisc, udisc, log, enum, array, matrix or record |
| MMdl6421 | illegal type <%3> for record element <%2> in external %1 - External record elements in experiments may only be of cont, limited, wrap around, sdisc, udisc, log, or enum |
| MMdl643 | illegal type %2 for record element "%1" - Record elements may not be references |
| MMdl644 | Assignments to records are not allowed (only to record references or primitive record elements) |
| MMdl645 | illegal type %2 for sender/receiver interface element "%1" - Elements may be cont, limited, wrap around, sdisc, udisc, log, enum, array, or record (with such elements) |
| MMdl6451 | Illegal type %2 for calibration interface element "%1" - Elements may be cont, limited, wrap around, sdisc, udisc, log, enum, array, or record (with such fields) |
| MMdl646 | Illegal type %2 for client/server operation "%3" argument "%1" - Arguments may be cont, limited, wrap around, sdisc, udisc, log, enum, array, or record (with such fields except arrays) |
| MMdl647 | Illegal type %1 for client/server operation "%2" return type - Returns may be enumerations (application errors) or AUTOSAR Std_ReturnType |
| MMdl648 | illegal use of interrupt task "%1" --- not supported, please remove from operating system specification |
| MMdl649 | Illegal type %1 (for element "%2" in %3) - used as application error |
| MMdl65 | illegal class for interpolation: expected char table, got <%1> |
| MMdl650 | Invalid type "1" for IRV "%2" - %3 |
| MMdl651 | Illegal type %2 for IRV "%1" - IRVs may be cont, limited, wrap around, sdisc, udisc, log, enum, or record (with such fields except arrays) |
| MMdl652 | Illegal %1 for element "%2" in %3 - must be %4 |
| MMdl66 | illegal dimension for interpolation: expected 1-D char table, got 2-D |
| MMdl67 | illegal dimension for interpolation: expected 2-D char table, got 1-D |
| MMdl670 | Cannot read or change the axis points of a fixed char table |
| MMdl671 | Interpolation performed on a changed char table without previous search on "%1" |
| MMdl672 | Fixed char table "%1" with a power-of-2 distance is not compatible with fixed char table "%2" |
| MMdl673 | Fixed char table "%1" is not compatible with fixed char table "%2" due to different axis definitions |
| MMdl674 | Fixed char table "%1" has non-equidistant implementation values %2 |
| MMdl68 | illegal class for search: expected distribution, got <%1> |
| MMdl69 | illegal implementation type for array/matrix <%1>: bit type not supported |
| MMdl7 | wrong number of arguments for %1 <%2> |
| MMdl71 | illegal value <%1> for case literal - exceeds value range <1..%2> of switch entry expression |
| MMdl710 | illegal value <%1> for case literal - does not match switch entry expression type <%2> |
| MMdl72 | illegal indexing of return value (function <%1> - must enable direct access (in code generation settings) |
| MMdl721 | Illegal receiver of direct access method call - must be an identifier |
| MMdl73 | expected constant expr in case statement |
| MMdl74 | illegal value <%1> for indexed expression "%2" |
| MMdl75 | unused code due to multiple return statements in method "%1" |
| MMdl76 | multiple default statements in switch statement |
| MMdl77 | index <%1> out of bounds for indexed expression "%2" |
| MMdl780 | Cannot use the local system constant <%1> as the variant for global element <%2>. |
| MMdl781 | Variant size <%1> for element <%2> must be a system constant. |
| MMdl782 | Variant size <%1> for element <%2> must be of type limited, wrap around, udisc, sdisc, or enum. |
| MMdl783 | Variant size <%1> for element <%2> must have values inside the array index range. |
| MMdl784 | It is not possible to use the element <%1> with a variant size as an implicit reference. |
| MMdl785 | It is not possible to use the element <%1> with a variant size when ResolveSystemConstants=Runtime. |
| MMdl786 | The init value <%3> of <%1> is out of bounds %2 due to ResolveSystemConstants=Generationtime. |
| MMdl787 | Element <%1> has variable array/matrix reference flag but is no reference. |
| MMdl788 | Expression <%1> can not be converted to a variable array/matrix reference. |
| MMdl789 | Fixed/variant reference <%1> can not be converted to variable reference. |
| MMdl790 | Variable array/matrix references should not be used as runnable <%1> arguments. |
| MMdl791 | Variable array/matrix references to array/matrix instance in records <%1> are not allowed. |
| MMdl792 | Variable array/matrix references to array/matrix with external get access are not allowed for %1. |
| MMdl793 | Element <%1> uses deprecated CCode reference. Please replace CCode reference (see implementation editor) by explicit reference (see properties editor). |
| MMdl794 | Element <%1> is a message and a reference, but the combination is not allowed. |
| MMdl8 | macro on stack is not an expr |
| MMdl81 | macro on stack is an expr |
| MMdl82 | read access to method local variable "%1" prior to assignment |
| MMdl821 | read access to method local variable "%1" prior to initialization of reference |
| MMdl83 | read access to a definitely uninitialized reference "%1" |
| MMdl84 | illegal use of method call "%1" - need constant value here |
| MMdl85 | illegal use of method call "%1" - only direct access macros allowed here |
| MMdl88 | illegal use of direct access to "%1" - no assignment allowed here |
| MMdl89 | illegal definition of direct access (%1) for "%2" - due to %3 |
| MMdl91 | method "%1" of class "%2" is not exported |
| MMdl92 | invalid recursive method call to "%1" --- possibly leads to infinite loop |
| MMdl93 | illegal use of type <%1> as system constant for element <%2> |
| MMdl94 | writable value expected instead of <%1> |
| MMdl95 | method argument "%1" not assigned, but needs assignment because of OUT direction |
| MMdl96 | method "%1" declared as side-effect-free, but %2 |
| MMdl97 | method "%1" declared with preprocessor inlining, but %2 |

[back to top](#Top)

##### Part 6: MS*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| MSm14 | transition may not start and end in a junction; transition will be ignored |
| MSm95 | Return values are not allowed for state reset methods |
| MSm96 | It is not allowed to call the state reset method during a transition |

[back to top](#Top)

##### Part 7: R*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| RIle1 | division by zero with variable <%1> in component <%2> |
| RIle11 | modulo by zero with variable <%1> in component <%2> |
| RIle12 | division with signed overflow with variable <%1> in component <%2> |
| RIle13 | modulo with signed overflow with variable <%1> in component <%2> |
| RIle2 | vector index out of range with variable <%1> in component <%2> |
| RIle21 | <variable <%1> in component <%2>> Index out of range (%%lu>=%3) |
| RIle22 | <variable <%1> in component <%2>> Index out of range (%%li<%3) |
| RIle3 | reached maximum number of loop iterations in component <%1> |

[back to top](#Top)

##### Part 8: Y*

| Column 1 | Column 2 |
| --- | --- |
| Message code | Error message |
| YBdl1 | argument <%1> of method <%2> can not be used in method <%3> |
| YBdl10 | <%1> has no local variable <%2> |
| YBdl11 | name of method is not valid |
| YBdl12 | found a block with no ports |
| YBdl13 | duplicate method and number |
| YBdl14 | no methods designed |
| YBdl15 | module has no methods |
| YBdl16 | double sequence number <%1> for <%2> |
| YBdl17 | method %1 not found |
| YBdl18 | ******** Name of current module: %1 ********* |
| YBdl2 | return value does not belong to <%1> |
| YBdl21 | <%1> must either be designed by state machine or block diagram |
| YBdl22 | method <%1> must be defined; need a return value |
| YBdl4 | block connection failure |
| YBdl5 | missing connection at <%1> block |
| YBdl51 | missing argument connection for method <%1> at block <%2> |
| YBdl52 | missing connection at hierarchy port <%1> |
| YBdl6 | delay-free loop detected at <%1> block |
| YBdl61 | delay-free loop detected between: %1 |
| YBdl62 | delay-free control loop detected |
| YBdl7 | <then> part of IF block must be specified |
| YBdl71 | incorrect cycle in control flow at block <%1> |
| YBdl72 | status part of explicit access block must be specified |
| YBdl73 | output of RTE call with status part may only be used in assignment |
| YBdl74 | Statement block-local sequence call used in %1 |
| YBdl75 | Duplicate name "%1" for statement block |
| YBdl8 | control and dataflow mismatch |
| YBdl81 | missing control flow connection ending at sequence call |
| YBdl9 | found illegal character in name <%1> |
| YLm1 | %1 line: %2 pos: %3 Examples |
| YLm17 | method %1 not found |
| YPMI0 | %1 |
| YPMI1 | Error on line %1: %2 |
| YSm20 | %1 needs start state |
| YSm21 | %1 may not have multiple start states |
| YSm30 | %1 must contain (concrete) states |
| YSm50 | multiple prio %1 for trigger "%2" in %3 |
| YSm60 | missing trigger specification; each state to state transition path needs to specify a trigger |
| YSm61 | multiple trigger specification; each single state to state transition path must not specify more than one trigger |
| YSm62 | junction transition cycle is not allowed |
| YSm70 | specification error: no static action may be specified for transition segments entering junctions |
| YSm71 | specification error: name of state "%1" must be unique with respect to element/method names, but %2 already exists |
| YSm72 | higher priority transitions do not exit %1, but this transition does. |
| YSm73 | multiple states with identical label "%1" |
| YSm80 | expression expected for condition |
| YSm90 | transitions into a closed hierarchy must not be followed by a transition out of a closed hierarchy |
| YSm95 | User-specified returns are not allowed |

[back to top](#Top)

See also

[List of Information Messages](List_of_Information_Messages.md)

[List of Warning Messages](List_of_Warning_Messages.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
