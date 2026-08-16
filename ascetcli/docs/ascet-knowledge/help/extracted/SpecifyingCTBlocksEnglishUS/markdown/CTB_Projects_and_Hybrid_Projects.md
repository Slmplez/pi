# Projects and Hybrid Projects

The real-time experiment is defined in a project. Both basic blocks and structure blocks can be used in a project. Furthermore, it is only in the project where individual integration methods and their step size can be assigned to each integrated basic block or structure block. This allows allocating more CPU time to the model part with high dynamics than to other, less dynamic model parts, if the processor capacity is limited.

For a model in which the controller and control system models are to be combined, a hybrid project can be defined, i.e., a project that contains both CT blocks and standard ASCET components. A hybrid project thus allows the simulation of the control system and the control unit in one model (hybrid simulation).

![](9908ct_Projekt.bmp)

The communication between individual CT blocks and individual controller modules is performed by explicitly connecting inputs and outputs in the Block Diagram Editor for details on projects, refer to [Overview-Project Editor](ProjectEditorEnglishUS.chm::/PE_Overview.htm).

The experiment can be conducted on-line on the real-time simulation hardware or off-line on the PC (unless special hardware has to be available or integrated for the experiment).

See also

[Modeling with CT Blocks](CTB_Modeling_with_CT_Blocks.md)

[Structure Blocks](CTB_Structure_Blocks.md)

[Usage of CT Blocks](CTB_Usage_of_CT_Blocks.md)

[Modeling with Graphical Hierarchies](CTB_Modeling_with_Graphical_Hierarchies.md)

[Experiments](CTB_Experiments.md)

[Overview-Project Editor](ProjectEditorEnglishUS.chm::/PE_Overview.htm)
