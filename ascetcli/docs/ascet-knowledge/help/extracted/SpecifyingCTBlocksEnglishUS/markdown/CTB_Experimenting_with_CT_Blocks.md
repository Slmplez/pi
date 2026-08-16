# Experimenting with Continuous Time Blocks

It is possible to run offline experiments with individual CT blocks. The blocks can be complex, i.e. they can reference other blocks. It is not possible, however, to conduct hybrid experiments in this way. Hybrid experiments consist of both classes and CT blocks and are used to simulate control loops consisting of a controller and a process model. These loops can be experimented within projects.

Experimenting offline with individual CT blocks works in the same way as experimenting with classes (see [Analyzing Components](BlockDiagramEditorEnglishUS.chm::/AnalyzingComponents.htm)), except that there is no event generator. A solver has to be specified instead.

See also

[Analyzing Components](BlockDiagramEditorEnglishUS.chm::/AnalyzingComponents.htm)

[Experimenting with a CT Block](CTB_Experiment_with_a_CT_Bock.md)

[Configuring the Integration Method](CTB_Configuring_the_Solver.md)
