# List of Warning Messages

The list of ASCET warning messages is split in several parts. Warning messages that are, by default, promoted to an error message, are marked with the following icons: ![](icon_globalPromoted.gif)

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| List of Warning Messages, Part1 : WB* |  | List of Warning Messages, Part5 : WM* |
| List of Warning Messages, Part2 : WC* |  | List of Warning Messages, Part6 : WO* |
| List of Warning Messages, Part3 : WI* |  | List of Warning Messages, Part7 : WS* |
| List of Warning Messages, Part4 : WL* |  |  |

##### Part 1: WB*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WBdl11 | no export of <%1> --- used local in <%2> instead |
| WBdl2 | %1 "%2" (using <%3> specification) is not defined |
| WBdl30 | Method sequence call should not be used inside a statement block |
| WBdl31 | A statement block should not have a control-flow pin |
| WBdl5 | ignored all sequence calls of state machine <%1> |
| WBdl6 | ignored incomplete call <%1> at block <%2> |
| WBdl61 | ignored incomplete connection at block <%1> |
| WBdl7 | ignored return block of <%1> |
| WBdl70 | ignored local variable block <%1> |
| WBdl71 | ignored argument block <%1> |
| WBdl72 | ignored control flow at block <%1> |
| WBdl73 | ignored break block, due to missing return value |
| WBdl74 | ignored block of method <%1> during generation of diagram <%2> |
| WBdl8 | literal value <%1> does not fit type <sdisc> - limited to <%2> |
| WBdl81 | literal value <%1> does not fit type <udisc> - limited to <%2> |
| WBdl9 | empty sequence call with all arguments connected at block <%1> |
| WBdl91 | Specified temporary variable not used at block <%1> |

[back to top](#Top)

##### Part 2: WC*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WCCg10 | Undefined memory class <%1>; using default |
| WCCg11 | Unsupported record layout <%1> for parameter <%2>; using default |
| WCCg12 | Input of Characteristic table <%1> should be a non-temporary variable |
| WCCg13 | Undefined code syntax <%1>; using default |
| WCCg5 | Access Method for setting complex variable <%1> is not allowed for controller target |
| WCCg51 | Access Method for settings complex variable <%1> is not allowed, if "asReference" is not specified |
| WCCg6 | (CodeGenerator) Input of Characteristic table <%1> should be a non-temporary variable |
| WCG10 | Obsolete template parameter: "%2" used for symbol "%1" - will be replaced by modern equivalents |
| WCg5 | %1 "%2", used as SHORT-NAME tag in AUTOSAR XML generation, must not %3 |
| WCg6 | The type casting "%1" will be removed in future versions, please select one of the other type casting strategies instead. |
| WCg7 | The type casting "%1" does not support combined arithmetic services without limitation of the intermediate result. Please use the MISRA type casting instead. |
| WCta50 | put direct link statement into <directOutputs> method |
| WCta51 | put nondirect link statement into <nondirectOutputs> method |
| WCta52 | output <%1> is assigned direct and nondirect |

[back to top](#Top)

##### Part 3: WI*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WIa10 | assignment with activated limitation flag is used as running variable in FOR statement |
| WIa12 | Interval (physical) mismatch in assignment to <%1> %2 := %3 (will NOT be limited) |
| WIa13 | Interval (physical) mismatch in method argument to <%1> %2 := %3 (will NOT be limited) |
| WIa14 | overflow detection for interval (%1) with specification (<%2> and <%3>) at element "%4" |
| WIa15 | Interval (implementation) out of bounds in assignment to <%1> %2 := %3 (will NOT be limited) |
| WIa16 | Increment/decrement operation on <%1> without limitation |
| WIa17 | Interval out of bounds in assignment to <%1> %2 := %3 (will NOT be limited) |
| WIa2 | Index Interval %2 out of range %1 (will be limited) |
| WIa3 | Arithmetic operation exceeds available bit length and may not be correct |
| WIa32 | Arithmetic (%1) operation overflows by %2 bits (will NOT be handled) |
| WIa33 | Negation of an unsigned two's complement value should be avoided |
| WIa4 | An additional numerical error is introduced by incompatible quantizations |
| WIa5 | Type mismatch in call to service routine |
| WIa6 | Non-linear formula <%1> of <%2> is treated as identity; code may be unexpected. |
| WIa61 | Discrete element <%2> with non-identity formula <%1> - will be generated as cont type |
| WIa62 | Element "%1" using %2 must have identity formula --- formula "ident" is used instead of formula "%3" |
| WIa63 | Implementation flag "Limit to maximum bit length" is not supported for type %1 |
| WIa66 | Assignment of %1 reference from <%3> to <%2> with different implementations |
| WIa67 | Assignment of <%2> to INOUT parameter <%1> with different implementations |
| WIa7 | Implementation mismatch of variable <%1> and method argument <%2> |
| WIa8 | Could not avoid division (scaling factor almost zero) |
| WIa9 | Physical interval %1 of divisor contains zero. |
| WIa91 | Loosing precision: interval chosen for denominator (%1) will lead to poor result due to values close to zero |
| WIa92 | Loosing precision: interval chosen for denominator (%1) will lead to poor result due to values close to zero - use %2 instead |
| WIa93 | Scaling %1 is not representable, using approximation %2 instead. |
| WIle1 | binary operation exceeds available bit length and may not be correct |
| WIle11 | arithmetic operation exceeds available bit length and may not be correct |
| WIle110 | Two's complement operation with %1 bits wraps around, but the result is used with %2 bits |
| WIle111 | Division with a constant followed by a multiplication with a constant is not reduced |
| WIle112 | Conversion of expression of type %1 to %2 with overflow |
| WIle113 | Conversion of a calculation from %1 to %2 |
| WIle114 | Implementation flag "Limit to maximum bit length" is not supported for type %1 |
| WIle115 | Conversion of a calculation with wrap-around to floating point |
| WIle12 | arithmetic operation has singleton interval and may not be correct |
| WIle120 | result of arithmetic operation is always %1 and may be incorrect |
| WIle121 | result of arithmetic operation is always %1 or %2 and may be incorrect |
| WIle13 | arithmetic shift right operation with big shift may lead to incorrect result |
| WIle14 | potential overflow of 1 in integer division result for min_signed/-1, will be ignored |
| WIle15 | potential division by 0, will be ignored |
| WIle150 | Protection of %1 is not generated based on interval information of elements without assignment limitation |
| WIle16 | Arithmetic operation overflows by %1 bits, but only %2 bits are available |
| WIle17 | Unable to limit expression correctly, since interval %1 has width of less than 1 |
| WIle18 | Approximation of <%1> by <%2> leads to an relative error of <%3> (which is bigger than <%4> given in the tool options) |
| WIle20 | optional arithmetic service <%1> not found, will use alternative code |
| WIle201 | found complement service definition for type "%1" in file "%2" without explicit redundant data type; using "%3" as redundant data type instead (Use "complement\|%1\|%3" to explicit define the redundant data type) |
| WIle21 | Unknown service definition key "%1" in file "%2" |
| WIle22 | Distribution is filled with identical axis points |
| WIle30 | codegen.ini option entry >resolveSystemConstants=%1< not valid for experimental code - use default: %2 |
| WIle31 | codegen.ini option entry >resolveSystemConstants=%1< not valid - use default: %2 |
| WIle35 | codegen.ini option entry >%1< unknown --- ignored |
| WIle365896 | Udisc/Sdisc may be generated in an unexpected way. |
| WIle40 | unknown memory class %1 --- please provide specification in memory class declaration file "memorySections.xml" |
| WIle41 | memory class not defined for reference <%1> |
| WIle50 | unreachable code after %1 statement --- removed |
| WIle51 | Explicit %1 access to message "%2" ignored due to message usage variant option set to "%3" |
| WIle60 | The software component uses enumeration "%1". Check the ranges of the texttable compu-methods in the ARXML files generated by ASCET |
| WIle77 | index <%1> possibly out of bounds for indexed expression "%2"%3 |
| WIle78 | index <%1> possibly out of bounds for indexed expression "%2", but unable to limit correctly. |
| WIle8 | invalid compile time constant expression - floating point constant detected - generating runtime code instead |
| WIle92 | Code will violate MISRA rule 10.1: cannot assign expression with interval %1 to type %2 |
| WIle97 | Cannot determine access path to complex expression receiver %1 |

[back to top](#Top)

##### Part 4: WL*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WLm1 | formula in implementation for <%1> not known in current project --- using identity |
| WLm10 | need export for imported element <%1> with type <%2> |
| WLm11 | formula named "%1" used for item <%2> does not comply with ASAM-2MC --- please rename formula; hint: use "Extras - Global Replace Formula" menu |
| WLm20 | both export <%1> and import <%2> must be of kind <%3> |
| WLm3 | <%1> NOT touched because of missing write permission |

[back to top](#Top)

##### Part 5: WM*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WMake21 | All instances of class %1 will share the same parameter set |
| WMake22 | %1 is empty for interpolation %2 |
| WMake220 | %3 %1 (original value %2) not found for interpolation %4, but exist after replacement of make variables |
| WMake221 | Unknown interpolation ID "%1" in interpolation alias mapping file %2 - this mapping is ignored |
| WMake222 | The interpolation "%1" is not an alias, but is mapped - this mapping is ignored |
| WMake223 | The interpolation "%1" is an alias, but is the target of a mapping - this mapping is ignored |
| WMake224 | Duplicate mapping of interpolation "%1" - this mapping is ignored |
| WMake28 | ResolveSystemConstant=AtRunTime is not supported for SE targets |
| WMake30 | The batch build process is deprecated - please enable the make build process |
| WMake40 | target specific option %1="%2" not valid %3- use default: %4 |
| WMake70 | Invalid OS specification - task list must not be empty |
| WMdl0 | please note: the feature <%1> is obsolete and will be removed in the future |
| WMdl1 | inline method <%1> not yet specified - generated method call |
| WMdl104 | <%1> - due to %2 - is not a lvalue and can not be used with a %3 method argument |
| WMdl105 | method <%1> in service/prototype class has element <%2> of type <%3> - the layout is generated by ASCET (maybe only for experiments) and should therefore not be used externally |
| WMdl106 | element <%1> in service/prototype class is of type <%2> - the layout is generated by ASCET (maybe only for experiments) and should therefore not be used externally |
| WMdl11 | expected global variable <%1> for export - used local instead |
| WMdl111 | usage of "%1" variable requires additional effort for ECU integration (in AUTOSAR context) |
| WMdl1191 | RTE status variable may reference multiple status returns |
| WMdl14 | not supported for controller targets: process "%1" used in more than one task (%2) |
| WMdl140 | target %1 does not support Timetable - use Alarm Timer instead |
| WMdl15 | no tasks specified - will lead to linker errors |
| WMdl150 | Memory class "%1" specified for %2 is not declared in file "%3memorySections.xml" - Please add declaration |
| WMdl151 | Memory segment "%1" specified for %2 is not declared in file "%3memorySections.xml" - Treated as "Automatic" |
| WMdl152 | Unable to propagate memory segment "%1" to record because it is accessed via reference |
| WMdl16 | runnables of component "%1" not mapped to events - might lead to errors during compilation |
| WMdl160 | element "%1" not passed to EHOOKS, since measurement of tables is not supported by ASAM 2MC 1.4 standard |
| WMdl161 | message "%1" hooked to "%2" but not written in any bypass function |
| WMdl162 | component "%1" not passed to EHOOKS (as single instance) for ASAM-2MC generation, since it is used as a %2 |
| WMdl2 | variable "dT" not specified, generate default variable |
| WMdl200 | deprecated feature: implicit reference of <%1>. declare an explicit reference instead! |
| WMdl201 | Method call argument "%2" used multiple times with OUT or INOUT direction in "%1", values may overwrite each other |
| WMdl202 | explicit reference flag and deprecated asReference flag in C code component are not equal for element <%1>. |
| WMdl203 | Model type %1 for element %2 is deprecated - use limitInt or wrapInt instead |
| WMdl204 | deprecated feature: BDE temp variables |
| WMdl275 | Mapping of record typed element "%1" requires all fields to be mapped; missing mappings for fields (%2) |
| WMdl283 | Invalid settings of AUTOSAR attributes for element "%1": %2="%3" and %4="%5" - use %6="%7" instead |
| WMdl285 | Interrunnable Variable "%1" not used |
| WMdl286 | Interrunnable Variable "%1" used in one runnable ("%2") only |
| WMdl288 | Explicit access (%1) to explicit IRV "%2" ignored |
| WMdl2881 | Explicit access (%1) to message "%2", which is not mapped to an IRV, is ignored |
| WMdl291 | %1 preemptive priority levels exceed maximum of %2 (task priorities are in range) |
| WMdl292 | %1 cooperative priority levels exceed maximum of %2 (task priorities are in range) |
| WMdl293 | %1 software priority levels (cooperative + preemptive) exceed maximum of %2 (task priorities are in range) |
| WMdl3 | used expr <%1> as a statement |
| WMdl3026 | Unable to read from write-only element <%1> |
| WMdl3027 | Reference element <%1> may point to stack-local element <%2>, but is not allowed to do so |
| WMdl309 | Interpolation for element %5 between index %1 (value %2) and %3 (value %4) may lead to value 0, but element is specified as ZERO NOT INCLUDED |
| WMdl31 | used assignment to <%1> as expression |
| WMdl310 | application mode "%1" is assigned to several init tasks: %2 --- only one init task per application mode is allowed |
| WMdl311 | application mode "%1" requires init task to be assigned to |
| WMdl312 | read access to message "%1" in method "%2" might not return current value in context of %3 "%4" due to option "message usage variant" set to %5 |
| WMdl313 | write access to message "%1" in method "%2" might not affect current value in context of %3 "%4" due to option "message usage variant" set to %5 |
| WMdl314 | %1 access to message "%2" in function "%3", but not called from any task with option "message usage variant" set to %4 |
| WMdl315 | No task calls process "%1" defined in generic component "%2" |
| WMdl320 | disabling message copy generation might be unsafe with respect to data integrity |
| WMdl35 | unusual type <%1> for operation "%2" |
| WMdl385 | %1 message "%2" not used |
| WMdl386 | Unmapped message "%1" used in one runnable ("%2") only - generated as variable without access protection |
| WMdl40 | public %1 "%2" specified as inline may not call private method "%3" |
| WMdl400 | Element "%1" has both attributes >non volatile< and >virtual< set. This is not allowed anymore, please change settings manually. |
| WMdl42 | External %1 access activated for element "%2" but generation of data structures for component "%3" disabled |
| WMdl47 | Implementation of instance <%1> of non-rescalable component <%2> does not need a rescaling formula - will be ignored |
| WMdl491 | No dispatch point is connected to bypass function "%1" |
| WMdl492 | Unknown process reference at index %1 in bypass function "%2" - will be ignored |
| WMdl50 | Implementation type "%1" for logic typed element "%2" not supported by AUTOSAR - changed to "bool" |
| WMdl51 | Data Element "%1" of provide port "%2" (%3 "%4") not written to in SW Component |
| WMdl52 | Not supported implementation specification "%1" for executable "%2" - removed %1 for generation |
| WMdl55 | Different init values of %1 (%2) and mapped message "%3" (%4) |
| WMdl6 | type mismatch with casting from <%1> (<%2>) to <%3> |
| WMdl606 | expected VOID method, i.e. no return value |
| WMdl61 | type mismatch: propagation of implementation for <%1> from <%2> to <%3> |
| WMdl611 | Variable %1 without implementation is used as an OUT argument - default implementation is used |
| WMdl612 | Variable %1 without implementation is used as an OUT argument and assigned later - implementation is taken from assignment |
| WMdl613 | Variable %1 without implementation and discrete model type must have an integer implementation type and the identity formula - default implementation is used |
| WMdl614 | Variable %1 without implementation and udisc model type will get a signed implementation type |
| WMdl615 | Variable %1 without implementation and sdisc model type will get an unsigned implementation type |
| WMdl620 | Type mismatch in %1 mapping of message "%2". Boolean type ([0,1]) expected, got interval "%3" |
| WMdl621 | Type mismatch in %1 mapping of message "%2". Enumeration type "%3" (%4) expected, got "%5" (%6) |
| WMdl622 | Type mismatch in %1 mapping of message "%2". Float type "%3" expected, got "%4" |
| WMdl623 | Type mismatch in %1 mapping of message "%2". Formula "%3" and interval %4 expected, got "%5" (%6) |
| WMdl625 | Possible loss of precision in conversion. Intermediate type (float32) supports 23 signifiant bits only, but %1 "%2" has larger implementation interval "%3" |
| WMdl626 | Conversion of a two's complement calculation to model type %1. |
| WMdl627 | Comparison of a two's complement calculation |
| WMdl63 | type mismatch: expected <%1>, got <%2> - the value has been implicitly converted |
| WMdl635 | non identical types in %1 mapping for "%2" (defined in "%3") - %4: expected <%5>, got <%6> |
| WMdl65 | type mismatch in array max size: <%1> and <%2> - accepted since larger matches smaller |
| WMdl651 | Possible type mismatch in array max size: <%1> and <%2> - will be checked at compile time |
| WMdl66 | mismatch of interpolation: %1 and %2 |
| WMdl67 | mismatch of extrapolation: %1 and %2 |
| WMdl68 | implicit casting of array/matrix <%1> to fixed array/matrix of size 1 for method call to <%2> |
| WMdl7 | init value <%1> of element "%2" does not match specified physical interval %3 of selected implementation |
| WMdl71 | Axis points for fixed char table %1 should have equal distances |
| WMdl72 | Axis points of element %1 should be in strict monotonic %3 order %2 |
| WMdl721 | Interpolation potentially performed on a char table without previous search on "%1" |
| WMdl73 | Char table axis with only one element, should be at least two |
| WMdl74 | type <%1> of indexed expression "%2" allows negative values --- potential problem for indexing |
| WMdl8 | Non-volatile variable "%1" not supported for target %2 |
| WMdl82 | read access to method local variable "%1" possibly prior to assignment |
| WMdl821 | read access to method local variable "%1" possibly prior to initialization of reference |
| WMdl822 | read access to reference without init value "%1" possibly prior to initialization of reference |
| WMdl83 | Evaluation order may not be preserved in the compiled code and lead to unexpected behaviour |
| WMdl84 | Evaluation order may not be preserved in the compiled code and possibly lead to unexpected behaviour |
| WMdl85 | Evaluation order could not be determined because of code preview - please generate code |
| WMdl86 | send message "%1" probably used as receive message |
| WMdl87 | receive message "%1" probably used as send message |
| WMdl881 | Comparison of a continuous value for equality or inequality |
| WMdl882 | An else-clause is missing in this if .. else if construct. |
| WMdl883 | The default clause is not the last clause in this switch statement |
| WMdl884 | The switch statement does not contain a case clause |
| WMdl885 | The case or default clause is not empty and not terminated by an unconditional break or return |
| WMdl886 | Comparison of fixed point values with unknown precision for equality or inequality |
| WMdl887 | Comparison of a fixed point value and a constant value that needs to be rounded for equality or inequality |
| WMdl9 | element "%1" already declared in component scope |
| WMdl921 | project option "Max. number of Iterations" set to 0 --- no infinite loop protection |
| WMdl93 | obsolete feature: enum <%1> as index of <%2>, use "%3.value()" instead |
| WMdl94 | Unknown enum label "%1", using variable with this name instead |
| WMdl941 | Variable name "%1" has pattern _t<n>, where <n> is a decimal number, and is reserved for temporary variables |
| WMdl95 | method argument "%1" possibly not assigned, but needs assignment because of OUT direction |
| WMdl96 | method argument "%1" never assigned although declared with INOUT direction |
| WMdl961 | method "%1" is declared as side-effect-free, but has no return value |
| WMdl962 | method "%1" is declared as side-effect-free, but return value is not used |
| WMdl97 | method argument "%1" never read although declared with INOUT direction |
| WMdl98 | BDE temp variable expression <%1> has side effects and option <Disable BDE Temp Variables> is set -- this may lead to problems, please adapt your model |
| WMdl99 | previous assigments to identifier "%1" have no effect because it is used as method argument with OUT direction |

[back to top](#Top)

##### Part 6: WO*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WOS1 | missing process in task "%1" |
| WOS10 | no start application mode specified - using <%1> |
| WOS2 | missing module in project |

[back to top](#Top)

##### Part 7: WS*

| Column 1 | Column 2 |
| --- | --- |
| Message Code | Warning Message |
| WSm10 | transition startPin has no connection: transition will be ignored |
| WSm11 | transition endPin has no connection: transition will be ignored |
| WSm12 | incomplete state to state transition; missing transition segments leaving junction; all entering segments will be ignored |
| WSm13 | incomplete state to state transition; missing transition segments entering junction; all leaving segments will be ignored |
| WSm15 | %1 overlaps with other %2 |
| WSm40 | unreachable %1 |
| WSm60 | STATIC action at %1 is ineffective with %2 |
| WSm70 | condition makes other transitions at %1 unreachable |
| WSm80 | %1 not defined |
| WSm81 | Value of sm variable is not specified at this point |
| WSm95 | specified state reset method body is being discarded - possibly unintended loss of code |
| WSm96 | potential call the state reset method during a transition |

[back to top](#Top)

See also

[List of Error Messages](List_of_Error_Messages.md)

[List of Information Messages](List_of_Information_Messages.md)
