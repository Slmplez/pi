# HexFile Reader Options

The setting options for the executable files are located in the HexFile Reader node.

HexFile Format

Default format for exporting a hex file.

Possible values: IntelHex / MotorolaSRecord

IntelHex Record Size

Permissible number of bytes per field for the IntelHex format.

Possible values:16 / 32 / 64

SRecord Count

Determines whether the number of data fields is written at the end of each block (and before a possible subsequent termination record).

SRecord Format

Address width in bits in Motorola format.

Possible values:16 / 24 / 32

SRecord Size

Permissible number of bytes per field for the Motorola format.

Possible values:16 / 24 / 32

SRecord Termination

Specifies whether a termination record is put at the end of each block or not (and before a possible subsequent termination record).

The options SRecord* are only of any importance if MotorolaSRecord was selected under HexFile Format.
