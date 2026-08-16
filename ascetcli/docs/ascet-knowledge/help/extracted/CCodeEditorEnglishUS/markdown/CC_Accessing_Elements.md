# Accessing Elements

To allow easy access to the elements of the component, a macro is defined automatically for each element. Each element can then be accessed simply by its element name.

The public elements defined in other components can be accessed from within C functions using the notation DefiningObject.PublicElement. Access is restricted to basic elements, arrays and matrices. The public interface of complex elements defined in other components, e.g. using the getAt, setAt or search and intepolate methods as in ESDL, cannot be accessed from C functions.

See also

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Characteristic Maps](CC_Characteristic_Maps.md)
