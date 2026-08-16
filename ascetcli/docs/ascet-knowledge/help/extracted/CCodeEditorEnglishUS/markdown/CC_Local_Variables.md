# Local Variables

Following the general C rules, function-local variables can be declared in the method body. Here only variables of a C data type can be declared, not however of an ASCET model type. In particular, no local variables of a user-defined type can be used in components within body specifications in C.

real64 i;

for (i=0; i < 10; i++)

{

sum = sum + a [i];

}

Since there is a code variant for each implementation variant, the user can define the local variables and their data types with respect to the implementation variant.

See also

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Characteristic Maps](CC_Characteristic_Maps.md)
