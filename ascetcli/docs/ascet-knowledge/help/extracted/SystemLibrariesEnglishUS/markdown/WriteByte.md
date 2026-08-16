# WriteByte

| Column 1 | Column 2 |
| --- | --- |
|  | writeByte writes the values of eight logical inputs to the eight least significant bits of the argument. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| writeByte | bitArray ::unsigned discrete | unsigned discrete |
|  | b0 ::logical |  |
|  | b1 ::logical |  |
|  | b2 ::logical |  |
|  | b3 ::logical |  |
|  | b4 ::logical |  |
|  | b5 ::logical |  |
|  | b6 ::logical |  |
|  | b7 ::logical |  |

On activation of method

WriteByte

The argument is returned with the values of b0 to b7 written to the bit positions 0 to 7. 0 is the position of the LSB and the logical values TRUE and FALSE are mapped to 1 and 0 respectively.
