# Summary - Direct and Nondirect Output

ASCET sorts CT blocks or methods in connected CT blocks directly depending on each other automatically in the correct order (automatic sequencing). If an algebraic loop exists in the model, ASCET terminates with an appropriate error message when determining the computing sequence. This occurs, for example, if two or more CT blocks with direct outputs form a feedback loop

To enable the automatic determination and control of the computing sequence, the output property has to be specified. Outputs that directly depend on inputs have to be specified or described in the directOutputs method. Such a CT basic block is said to have a direct output or a direct pass-through. Outputs that do not directly depend on inputs are specified in the nondirectOutputs method. Such a CT basic block is said to have a nondirect output or a nondirect pass-through.

Wrongly declared outputs (e.g., direct output in the nondirectOutputsmethod) are detected if the ESDL modeling language is used. In CT blocks written in the C programming language, the nondirect or direct property is determined by the model designer.

See also

[Continuous Time Structure Blocks](CTB_Continuous_Time_Structure_Blocks.md)

[Reuse of Structure Blocks](ctb_reuse_of_structure_blocks.md)

[Elements of a Continuous Time Structure Block](CTB_Elements_of_a_Continuous_Time_Structure_Block.md)

[Operators](CTB_Operators.md)

[Algebraic Loops](CTB_Algebraic_Loops.md)

[Behavior of Direct and Nondirect Output](CTB_Behavior_of_Direct_and_Nondirect_Output.md)

[Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md)

[Computing Sequence of Methods Within a Structure](CTB_Computing_Sequence_of_Methods_Within_a_Structure.md)
