# Elements of the Edit Area

The edit area displays the data pertaining to an entry in expanded form. Here you can also modify any of the values that form the entry.

The Operation field is a combo box from which you can select exactly one entry. The entries in this list show all possible and permitted operations and cannot be edited. If you select an operation from this list, any fields that are impertinent to the operation are automatically disabled. The following operations are available:

ADD, SUB, MUL, DIV, MOD, MULDIV, NEG, ABS

The Shift, Operand1, Operand2, Operand3 and Result fields are also combo boxes. The entries for all five of these fields are the same, and list all permissible types. These are:

ALL, UINT8, UINT16, UINT32, SINT8, SINT16, SINT32, REAL32, REAL64

The ALL type does not stand for any particular type, but is provided as a wildcard. You can also choose not to select a type. This option, however, is only allowed for operations that allow the use of optional parameters.

The Limitation option can be enabled for some operations.

The Generated Key field displays the key for the function, which is needed by ASCET. This field cannot be edited because these keys can be generated only by the program.

The Code for representation field shows the function call used for generating code in ASCET. In principle, any entry is allowed here because this does not have to follow any particular syntax and cannot be verified for correct syntax by the program.

The Parameters field is a combo box where you can select a parameter (such as %i1%) from a list. The parameter you select is added to the Code for representation automatically.
