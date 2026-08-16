# Overview - Variables and Function Parameters

The variables of a component are held in a data structure that, like the function heads, is automatically generated. The user has no influence on this data structure. A part of this data structure consists of the instance variables of the component, which can be used in any method. Therefore they have to be passed to all generated functions. This data structure also depends on the code expander and the exact naming is therefore hidden from the user.

In the above example, the component has a data structure of its own that is passed to the generated function for the method calc. The data structure could look like this:

struct QX040H28HJ8HAMDJ870S4G7MDIBQQLSM_Obj {

ASDObjectHeader objectHeader;

real64_Obj *a;

real64_Obj *b;

real64_Obj *c;

real64_Obj *d;

};

The element names must be valid ANSI C identifiers. In addition to the reserved keywords of C, the names self and this are reserved.

When specifying components in C code, the user must ensure that the names of functions called in the method body do not collide with the names of variables defined in the interface of that same component.

See also

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Characteristic Maps](CC_Characteristic_Maps.md)

[Structure](cc_structure.md)

[Header](CC_Header.md)
