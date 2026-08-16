# Messages

Messages are part of an intra-task (intra-process) communication concept used within ASCET models (see [Interprocess Communication](ProjectEditorEnglishUS.chm::/PE_Interprocess_Communication.htm)). To achieve data consistency, the ASCET code generation has to create additional message copies.

If messages are used within the functional code (read/write access), additional code is required to ensure safe copying of the current values from message originals to the local copies. Within the process body, only these local copies are used. At the end, all local copies which could change their value within the process body must be written back to the message originals.

In ESDL and block diagram components, ASCET generally detects very well, which messages are changed within a process. However, this functionality is of limited availability when using C code for the body specification. Here, the user has to take care of data consistency on his own.

In general, ASCET is not able to detect where and when a variable is written in user-specified C code. ASCET recognizes only a few special cases where, e.g., the variable name is followed by a =, or where assignment operators like ++ are used. If a variable is changed within a macro, an extern function, or via address operators and pointer arithmetic, ASCET does not detect the change.

When messages are used, this behavior results in message copies being created at the beginning of the process, but—under certain circumstances—not written back at the end.

See also

[Example: Messages](CC_Example__Messages.md)

[Overview - Variables and Function Parameters](CC_Overview_VariablesFunctionParameters.md)

[Accessing Elements](CC_Accessing_Elements.md)

[Automatically Generated define Statements for Instance Variables](CC_Automatic_define_Statements_InstanceVariables.md)

[Working with Basic Elements](CC_Working_with_Basic_Elements.md)

[Arguments](CC_Arguments.md)

[Local Variables](CC_Local_Variables.md)

[Characteristic Lines](CC_Characteristic_Lines.md)

[Characteristic Maps](CC_Characteristic_Maps.md)
