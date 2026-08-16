# Customizing Data Type Names

ASCET allows the customization of data type names (see [Data Type Names](IntroductionEnglishUS.chm::/INT_DataTypeNames.htm)). The customized names are used in the ASCET user interface and in the code generated for ASCET-SE targets. Code generated for experimental targets (RP targets, PC target, Prototyping target) uses the default data type names.

To customize data type names, proceed as follows.

1. Open the Options window and go to the [Data Type Names](CM_Options_DataTypeNames.md) node.
1. Activate the Use Customized Data Type Names option.
1. In the <data type> fields, overwrite the default names with your names.
1. Click OK to close the Options window.
1. Confirm the message with OK.
1. Follow the recommendation and restart ASCET.
1. For an ASCET-SE target, define the customized data types with normal C type definitions in the [a_user_def.h](IntroductionEnglishUS.chm::/INT_Example_a_user_def.h.htm) include file in the <install_dir>\targets\trg_<name>\include directory.

See also

[Data Type Names Options](CM_Options_DataTypeNames.md)

[Introduction - Data Type Names](IntroductionEnglishUS.chm::/INT_DataTypeNames.htm)

[Introduction - Example: a_user_def.h](IntroductionEnglishUS.chm::/INT_Example_a_user_def.h.htm)

[Introduction - Reserved Keywords](IntroductionEnglishUS.chm::/INT_Reserved_Keywords.htm)
