# Creating and Saving Arithmetic Services

The definitions of arithmetic services are maintained outside of ASCET in a services.ini file. A file of this type is stored separately for each target in a corresponding target directory. The file complies with the Windows standard for *.ini files.

To be able to quickly change the ASCET code generator for different requirements within a target, and thus gain the ability to use self-defined arithmetic service routines with great flexibility, it is possible to define and keep various sets of arithmetic services within one services.ini file. When it initializes, ASCET loads all of the information from the file for the current target, thus making it possible to apply any of the defined sets each time the code generator is run.

The entries in these files must follow this syntax (in BNF):

SERVICE-FILE ::= [ENTRY]+

ENTRY ::= [FUNCTION] | [COMMENT] | [SET]

COMMENT ::= ";" ∑*

SET ::= "[“∑+"]"

FUNCTION ::= [OPERATION](„|“[OPERAND])+ "=" ∑*

OPERATION ::= "abs" | "neg" | "+" | "-" | "*" | "/" | "%" | "+l" | "-l" | "*l" | "/l" | "*>" | "/>" | "*>l" | "/>l" | "*/" | "*/l"

OPERAND ::= "*" | "u8" | "u16" | "u32" | "s8" | "s16" | "s32" | "r32" | "r64"

For more details regarding the services.ini files and how to create and edit them, see [Interface Editor for Arithmetic Services](interface_editor_as.md).

See also

[Interface Editor for Arithmetic Services](interface_editor_as.md)
