# Difference Between Graphical Hierarchies and CT Structure Blocks

Externally, CT structure blocks behave like CT basic blocks regarding their computing sequence. The computing sequence is determined in the CT structure block. The structure behaves like a block with direct or nondirect output depending on whether the outputs of the structure block depend on the inputs directly or nondirectly

Hierarchies, however, have a purely symbolic nature used to layout a CT structure block more clearly. They do not affect the simulation. The left part of the figure shows an example in which a CT structure block has a direct output to a CT basic block which in turn has a direct output to the same CT structure block. This causes an algebraic loop as the two blocks within the structure block are computed directly succeeding each other (virtually simultaneously). However, the second CT block within the structure block requires a current output of the external CT block.

![](9908ct_Strukt_Hier.bmp)

The algebraic loop can be avoided by resolving the structure block and replacing it with a graphical hierarchy right-hand side of the figure that combines model parts obviously related with each other. A drawback of hierarchies is that they cannot be stored separately but only together with the structure block in which they are contained.

See also

[Continuous Time Structure Blocks](CTB_Continuous_Time_Structure_Blocks.md)

[Reuse of Structure Blocks](ctb_reuse_of_structure_blocks.md)

[Elements of a Continuous Time Structure Block](CTB_Elements_of_a_Continuous_Time_Structure_Block.md)

[Operators](CTB_Operators.md)

[Algebraic Loops](CTB_Algebraic_Loops.md)

[Summary - Direct and Nondirect Output](CTB_Summary_Direct_and_Nondirect_Output.md)

[Behavior of Direct and Nondirect Output](CTB_Behavior_of_Direct_and_Nondirect_Output.md)

[Computing Sequence of Methods Within a Structure](CTB_Computing_Sequence_of_Methods_Within_a_Structure.md)
