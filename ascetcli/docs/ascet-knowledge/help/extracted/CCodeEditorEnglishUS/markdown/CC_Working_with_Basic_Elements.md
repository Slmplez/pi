# Working with Basic Elements

For basic types, the method names of these types can be used. When accessing arrays or matrices, the index operator ’[]’ can be used in a C-like manner.

Since the method names of a user-defined type depend on the expander, the method of user-defined types can only be called with the knowledge of the exact generated function name for that method. In the above example the function name QX040H28HJ8HAMDJ870S4G7MDIBQQLSM_calc is generated for the method calc.

When using elements defined in ASCET, these elements are of a model type (either basic or user-defined). Basic types have the following default implementation, which is taken on the physical level:

- continuous = real64
- limitInt uses the specified interval
- wrapInt uses the specified interval
- udisc = unsigned int32
- sdisc = signed int32
- log = int16

Elements of type logical should not be used as numbers in the C code, since this depends on the default implementation, which is subject to change in further releases of ASCET.

The default implementation is replaced by the user-defined implementation when switching the specification level (e.g. fixed point code). Elements of model type logical can be represented for instance as a bit, and can therefore not be used as a number in the C code.

See also

[Scalar Types: Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types: Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Messages](CC_Messages.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Characteristic Maps](CC_Characteristic_Maps.md)
