# Modeling with Graphical Hierarchies

A CT structure block composed of many CT basic blocks and/or CT structure blocks can be designed more clearly by combining several related CT blocks in a graphical hierarchy. Graphical hierarchies and CT structures can be combined into new hierarchies-the processing sequence is not affected by these graphical hierarchies. In the Block Diagram Editor, graphical hierarchies are indicated by a double-line frame.

Graphical hierarchies are especially used when the individual CT blocks have strong cohesion and require a fixed computing sequence within an integration step. By using graphical hierarchies, algebraic loops refer to [Algebraic Loops](CTB_Algebraic_Loops.md) and [Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md) that may be caused by CT structure blocks can be avoided. The correct computing sequence is ensured by automatic sequencing. Graphical hierarchies cannot be stored individually but only together with the corresponding structure block.

![](9908ct_Hierarchie.bmp)

See also

[Modeling with CT Blocks](CTB_Modeling_with_CT_Blocks.md)

[Structure Blocks](CTB_Structure_Blocks.md)

[Usage of CT Blocks](CTB_Usage_of_CT_Blocks.md)

[Experiments](CTB_Experiments.md)

[Projects and Hybrid Projects](CTB_Projects_and_Hybrid_Projects.md)

[Algebraic Loops](CTB_Algebraic_Loops.md)

[Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md)
