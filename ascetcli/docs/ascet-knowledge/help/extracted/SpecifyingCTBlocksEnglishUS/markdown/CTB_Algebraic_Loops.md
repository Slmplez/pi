# Algebraic Loops

In the following equation system

x = f1(z)

y = f2(x)

z = f3(input a) (input a assumed valid)

each equation, with the exception of f3, depends on another equation. In order to allow the system to be computed from top to bottom correctly, the equations have to be rearranged as follows:

z = f3(input a)

x = f1(z)

y = f2(x)

In this sequence, the system can be easily computed, even by conventional PC programs.

An algebraic loop exists if:

y=f1(x);

x=f2(y);

i.e., if two functions directly depend on each other. y is needed to calculate x, and x is needed to calculate y.

See also

[Continuous Time Structure Blocks](CTB_Combining_Continuous_Time_Blocks_With_Modules.md)

[Reuse of Structure Blocks](ctb_reuse_of_structure_blocks.md)

[Elements of a Continuous Time Structure Block](CTB_Elements_of_a_Continuous_Time_Structure_Block.md)

[Operators](CTB_Operators.md)

[Summary - Direct and Nondirect Output](CTB_Summary_Direct_and_Nondirect_Output.md)

[Behavior of Direct and Nondirect Output](CTB_Behavior_of_Direct_and_Nondirect_Output.md)

[Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md)

[Computing Sequence of Methods Within a Structure](CTB_Computing_Sequence_of_Methods_Within_a_Structure.md)
