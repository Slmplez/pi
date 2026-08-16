# Overview - CT Basic Blocks

Continuous time basic blocks (CT basic blocks) are generally used to describe small, independent physical components that can be used in various model scenarios. Basic blocks can be specified using the CT block editor. The block interface is specified interactively and the dynamics of the physical component are described by differential and algebraic equations.

Continuous time basic blocks are specified either in the C code editor or in the ESDL editor. The target-independent ESDL modeling language provides advanced semantic verification ensuring a correct model. Modeling directly in C, therefore, should be confined to target-dependent real-time blocks only. In general, the use of ESDL is recommended.

The two editors are slightly different for the specification of CT blocks. The internals of the blocks, i.e., the differential and algebraic equations as well as the control structures, are described within pre-defined methods. The pre-defined method structure cannot be modified by the user. Each method has a specific purpose, e.g., the calculation of derivations or outputs.

The proper computing sequence required for correct, continuous time modeling is derived automatically (sequencing). In contrast to standard ASCET models, the execution sequence is fixed (see [Overview - Computing Sequence](ctb_overview_computing_sequence.md)), and the methods are scheduled automatically.

Basic blocks are used to describe models by means of nonlinear ordinary first-order differential equations (ODE) and nonlinear output equations. To describe a system of higher order, it has to be converted into several differential equations of first order. The table below illustrates the transformation of a second-order system into its representation in the state space.

| Column 1 | Column 2 |
| --- | --- |
| One 2nd-order differential equation | Two 1st-order differential equations |
| T2*x’’ + 2.0*d*T*x’ + x = K*in; | x’ = xp; xp’ = (K*in - (2.0*d*T*xp) - x) / T2; |

The equations can be written in ESDL or C. The use of ESDL ensures a target-independent specification and advanced semantic checks. When using C, the entire functionality of the C programming language is available. The drawback of C is that it is not possible to perform a semantic analysis. The use of ANSI C enables largely target-independent modeling, however, this is not the case if special language dialects such as for special hardware optimization is used. Furthermore in C, the block's behavior has to be specified as direct or nondirect.

See also

[Modeling With Continuous Time Basic Blocks](CTB_Modeling_With_CT_Basic_Blocks.md)

[Summary - Block Interfaces](CTB_summary.md)

[Summary-Block Methods](CTB_SummaryBlock_Methods.md)

[Overview - ESDL Editor](ESDLEditorEnglishUS.chm::/ESDL_Overview.htm)

[Overview - C Code Editor](CCodeEditorEnglishUS.chm::/CC_Overview.htm)

[Overview - Computing Sequence](ctb_overview_computing_sequence.md)
