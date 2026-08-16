# Hysteresis-LSP-Delta

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-LSP-Delta is a hysteresis with a left switching point and a delta offset |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous lsp ::continuous delta ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > (lsp + delta). FALSE is returned, if x < lsp. The return value is unchanged, if x lies within the open interval ]lsp, (lsp + delta)[.
