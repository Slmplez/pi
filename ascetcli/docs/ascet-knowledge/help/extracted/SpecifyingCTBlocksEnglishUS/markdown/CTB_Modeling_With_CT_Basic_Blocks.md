# Modeling With Continuous Time Basic Blocks

Within a continuous time basic block, the internals of the system to be modeled can be described using the ESDL model description language or directly in C. The target-independent ESDL modeling language provides advanced semantic verification ensuring a correct model. Modeling directly in C, therefore, should be confined to target-dependent real-time blocks only. In general, the use of ESDL is recommended.

The behavior of the block is described within a fixed framework, i.e., with a fixed number of methods. Each method has a specific purpose, e.g., the calculation of derivations or outputs. In contrast to standard ASCET models, the execution sequence is fixed, and the methods are scheduled automatically.

See also

[Continuous Time Blocks as C Code](CTB_ct_ccode.md)

[Continuous Time Blocks in ESDL](CTB_ct_esdl.md)
