# Hysteresis-LSP-RSP

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-LSP-RSP is a hysteresis with both a left and a right switching point |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous lsp ::continuous rsp ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > rsp. FALSE is returned, if x < lsp. The return value is unchanged, if x lies within the open interval ]lsp, rsp[.
