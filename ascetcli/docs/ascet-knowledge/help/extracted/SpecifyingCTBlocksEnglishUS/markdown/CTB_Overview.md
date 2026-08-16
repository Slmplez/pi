# Overview

Continuous time blocks (CT blocks) are used to describe models of the technical processes controlled by ASCET embedded software specifications. Entire control loops can be modelled and tested within ASCET in this way.

CT blocks are specified in the same way as other components, i.e. they can be specified either as block diagrams, C code or ESDL code. There is, however, a difference in functionality between CT blocks specified as block diagrams and those specified in code.

Basic continuous time blocks specified in code are used to model basic physical components, such as wheels, brakes, or hydraulic conduits. These components are typically described in terms of differential equations, which are more easily specified in code than as block diagrams. They are then combined into larger assemblies with continuous time structure blocks specified as block diagrams.

It is possible to reference standard ASCET classes, but this only makes sense if those classes are used as records, i.e. complex variables. It is not possible to use algorithms specified as standard classes in continuous time blocks.

Specifying CT Blocks shows how to specify continuous time blocks both as block diagrams and in code. The editors used are the same ones as for standard -ASCET classes, with slight variations. Only the differences from standard class specification are discussed here, so you should be familiar with the Block Diagram Editor (see [Block Diagram Editor](BlockDiagramEditorEnglishUS.chm::/BDE_Overview.htm)), the C Code Editor (see [C Code Editor](CCodeEditorEnglishUS.chm::/CC_Overview.htm)) and the ESDL Editor (see [ESDL Editor](ESDLEditorEnglishUS.chm::/ESDL_Overview.htm)).

The methods (type and number) available in CT basic blocks are pre-defined and cannot be modified by the user. Each method has a specific purpose, e.g. the calculation of derivations or outputs. The execution sequence of the methods is fixed, the methods are executed automatically. It is not necessary to use each method in a CT basic block.

The following methods are available in CT basic blocks:

- init()
- terminate()
- derivatives()
- update()
- directOutputs()
- nondirectOutputs()
- dependentParameters()
- stateEvents()
- events()

See also

[CT Blocks](ctb_ct_blocks.md)

[Block Diagram Editor - Overview](BlockDiagramEditorEnglishUS.chm::/BDE_Overview.htm)

[C Code Editor - Overview](CCodeEditorEnglishUS.chm::/CC_Overview.htm)

[ESDL Editor - Overview](ESDLEditorEnglishUS.chm::/ESDL_Overview.htm)

[init() Method](CTB_init_Method_.md)

[terminate() Method](CTB_terminate_Method_.md)

[derivatives() Method](CTB_derivatives_Method.md)

[update() Method](CTB_update_Method.md)

[directOutputs() Method](CTB_directOutputs_Method.md)

[nondirectOutputs() Method](CTB_nondirectOutputs_Method.md)

[dependentParameters() Method](CTB_dependentParameters_Method.md)

[stateEvents() Method](CTB_stateEvents_Method.md)

[events() Method](CTB_events_Method.md)
