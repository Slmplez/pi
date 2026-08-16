# OpenInterval (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | OpenInterval returns TRUE if the value u is in the open interval defined by MX and MN . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | MX:: continuous | logical |
|  | MN:: continuous |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if MN < u < MX. Otherwise FALSE is returned.
