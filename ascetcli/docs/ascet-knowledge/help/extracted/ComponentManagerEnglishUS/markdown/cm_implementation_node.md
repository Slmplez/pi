# Implementation Options

The implementation node contains the following options:

Implementation Master

Implementation master.

Possible values: Model / Implementation

Automatically select the Implementation Type

If this option is activated, and if you [select Model as master](ImplementationEditorEnglishUS.chm::/set_masterpg_impl.htm) in the implementation editor, the implementation data type is selected automatically.

If this option is disabled, the implementation data type is not changed automatically; you have to select the type.

"Limit Assignments" Flag for cont Data Type

If activated (= default), the "Limit assignments" flag is set for newly created scalar elements of type cont.

"Limit Assignments" Flag for sdisc Data Type

If activated (= default), the "Limit assignments" flag is set for newly created scalar elements of type sdisc.

"Limit Assignments" Flag for udisc Data Type

If activated, the "Limit assignments" flag is set for newly created scalar elements of type udisc.

Default: deactivated

The "Limit assignments" flag can be changed for each element on the [Value tab](ImplementationEditorEnglishUS.chm::/Value_Tab.htm) of the element's implementation editor.

Limit to Maximum Bit Length

Not applicable for udisc.

Specifies whether the result of an operation is to be limited in the case of an overflow.

Resolution Handling

Only available if Limit to Maximum Bit Length is activated.

Specifies how the resolution is to be handled in the case of an overflow.

Possible values: Automatic / Reduce Resolution / Keep Resolution

The [Default Implementation Types](cm_defaultimplementationtypes.md) subnode allows the selection of default implementation types for cont, log, sdisc and udisc elements.
