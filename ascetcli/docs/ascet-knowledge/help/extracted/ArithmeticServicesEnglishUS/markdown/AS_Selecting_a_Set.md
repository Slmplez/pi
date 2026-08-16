# Selecting a Set in a Project

Selecting a set of arithmetic services takes place within the scope of a project in ASCET.

You can use a different set (if available) each time you run the code generator. You can also choose not to use a set (by selecting None). In this case, the code generator applies the standard operations.

ASCET saves the information regarding the set that was last selected and last used for each individual project. If a set that is not stored in the current services.ini file is configured for a project (for example if a project has been loaded from another computer, which uses another file), the following error message is generated:

The selected set of arithmetic services ... is not available. Please check the services.ini file.

If a set does not yet have functions defined in it, which are required by the code generator to generate code, either an error message is displayed, or the standard operation is applied and a warning displayed – depending on the type of operation. For more information on this, refer to [Potential Error Conditions](AS_Potential_Error_Conditions.md).

See also

[Selecting a Set of Arithmetic Services](select_set_arith_services.md)

[Potential Error Conditions](AS_Potential_Error_Conditions.md)
