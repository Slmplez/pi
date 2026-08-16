# Computing Sequence of Methods Within a Structure

The computing sequence in a CT structure block is essentially determined by the computing sequence of the methods within a CT basic block (see [Overview - Computing Sequence](ctb_overview_computing_sequence.md)). It depends mainly on the integration method and the selected time or communication intervals.

In principle, the methods in the structure block are computed in the same sequence as in the basic block (init, nondirectOutputs, directOutputs,...), with the same method being executed first in all basic blocks of the structure block before switching to the next method. This means that the init method is first executed in all blocks before starting the nondirectOutputs method in any basic block.

As long as the directOutputs method is not used in any CT basic block, the sequence is exclusively determined by the CT basic blocks. The order in which the same method is executed in the individual CT basic blocks is not important. This means that first all init methods are computed, then all nondirectOutputsmethods, etc., each method in any arbitrary order of blocks.

If the directOutputs method is used in more than one block, the computing sequence becomes important, because some of the inputs of the directOutputsmethods require current values from other outputs. If the input is connected to an output of the nondirectOutputs method, there is always a current value, because this method is first computed in all CT blocks before starting the directOutputs method. However, if the input depends on the output of another directOutputs method, this method must be computed first.

See also

[Example: Computing Sequence](CTB_Example__Computing_Sequence.md)

[Example: Execution Not Possible](CTB_Example__Execution_Not_Possible.md)

[Continuous Time Structure Blocks](CTB_Continuous_Time_Structure_Blocks.md)

[Reuse of Structure Blocks](ctb_reuse_of_structure_blocks.md)

[Elements of a Continuous Time Structure Block](CTB_Elements_of_a_Continuous_Time_Structure_Block.md)

[Operators](CTB_Operators.md)

[Algebraic Loops](CTB_Algebraic_Loops.md)

[Summary - Direct and Nondirect Output](CTB_Summary_Direct_and_Nondirect_Output.md)

[Behavior of Direct and Nondirect Output](CTB_Behavior_of_Direct_and_Nondirect_Output.md)

[Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md)

[Overview - Computing Sequence](ctb_overview_computing_sequence.md)
