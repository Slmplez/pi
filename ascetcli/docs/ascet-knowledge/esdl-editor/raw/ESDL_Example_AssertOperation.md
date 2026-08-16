# Example: Assert Operation

A small ESDL example for the Assert operator has been created:

x = (a+b).assert(0,100) + c;

Variables a, b and c are implemented as sint8, x is implemented as sint16.

First, code is generated for an experimental target and the Implementation Experiment code generator. The assertion is generated as an assignment to a temporary variable (row 3 in the following table); this temporary variable is checked against the assertion interval (rows 5 - 8), and an experiment error (row 7) is issued if the assertion interval is violated.

The resulting C code reads as follows:

| Column 1 | Column 2 |
| --- | --- |
| 1 | void ESDL_ASSERT_IMPL_process(void) |
| 2 | { |
| 3 | sint16 _t1sint16; |
| 4 | _t1sint16 = (sint16)ESDL_ASSERT_IMPLinstance->a->val + ESDL_ASSERT_IMPLinstance->b->val; |
| 5 | if ((_t1sint16 < 0) \|\| (_t1sint16 > 100)) |
| 6 | { |
| 7 | asdWriteUserError ("Run Time Error: Value %d outside interval [%d..%d] in component <ESDL_Assert::Impl>\n", (real64)_t1sint16, 0.0, 100.0); |
| 8 | } |
| 9 | ESDL_ASSERT_IMPLinstance->x->val = _t1sint16 + ESDL_ASSERT_IMPLinstance->c->val; |
| 10 | } |

Next, code is generated for an ASCET-SE target and the Object Based Controller Implementation code generator. The assertion is not visible in the generated code, except for brackets and possibly suppressed optimizations.

The resulting C code reads as follows:

| Column 1 | Column 2 |
| --- | --- |
| 1 | void ESDL_ASSERT_IMPL_process (void) |
| 2 | { |
| 3 | _x = (sint16)_a + _b + _c; |
| 4 | } |

See also

[Assert Operation](ESDL_AssertOperation.md)
