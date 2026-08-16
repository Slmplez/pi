# Example: Statement Block

The following screenshot shows a simple block diagram with a statement block. The (diagram-wide) sequence calls are numbered A, B, and C.

![](statementBlock02.gif)

The statement block contains the following sub-graph. The block-local sequence calls are numbered B.1 and B.2.

![](statementBlock03.gif)

During code generation, the statement block is generated in the place indicated by the block's sequence call (B). The content of the statement block is generated in the order determined by the block-local sequence calls (B.1 and B.2).

| Column 1 | Column 2 |
| --- | --- |
|  | /* public process [] */ |
|  | void MODULE_BDE_EXHIER_IMPL_process(void) |
|  | { |
|  | /* temp. variables */ |
|  | sint16 _t1sint16; |
| A | /* process: sequence call #5 */ |
|  | _t1sint16 = (sint16)_cont_1 + _cont_2; |
|  | _out1 = _t1sint16; |
| B.1 | /* Statement Block: sequence call #5 */ |
|  | _buffer = (sint16)((_cont_3 * ((sint32)_dT * _Ki)) + _buffer); |
| B.2 | /* Statement Block: sequence call #20 */ |
|  | _out_3 = _buffer; |
| C | /* process: sequence call #15 */ |
|  | _t1sint16 = (sint16)_cont_1 + _cont_2; |
|  | _out2 = (sint32)_t1sint16 * _cont_2; |
|  | } |

The example code was generated with the ANSI-C target (available in ASCET-SE) for better readability.
