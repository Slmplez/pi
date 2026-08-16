# Example: Assert Operator

A small block diagram example for the Assert operator has been created:

![](assert_01.gif)

The explicit interrunnable variable a, variables b and c are implemented as sint8, the implicit interrunnable variable x is implemented as sint16. The assertion interval is set as follows:

![](assert_02.gif)

Code is generated for the ANSI-C target, the Object Based Controller Implementation code generator and an AUTOSAR operating system. The assertion is not visible in the generated code, except for brackets and possibly suppressed optimizations.

The resulting C code reads as follows:

| Column 1 | Column 2 |
| --- | --- |
| 1 | FUNC(void, CODE) SWC_assert_Impl_runnable (void) |
| 2 | { |
| 3 | Rte_IrvIWrite_runnable_x((SInt16)Rte_IrvRead_runnable_a() + _b + _c); |
| 4 | } |

See also

[Assert Operator](asc_assertoperator.md)
