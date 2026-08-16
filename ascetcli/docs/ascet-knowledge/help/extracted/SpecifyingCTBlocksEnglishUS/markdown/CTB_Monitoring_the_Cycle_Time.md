# Monitoring the Cycle Time

In the OS tab of the project editor, ASCET offers the possibility to measure the cycle time of a timer task (see [The Monitoring Option](ProjectEditorEnglishUS.chm::/monitoringoption.htm)).

For CT blocks, you have to keep the following in mind.

- The simulation of projects containing CT blocks allows the setting of two parameters for a selected solver:
- The external communication interval dT ([External Communication Interval dT](CTB_External_Communication_Interval_dT.md))
- The integration step size h ([Integration Step Size h](CTB_Integration_Step_Size_h.md)).

The cycle time for the simulation task simulate_CTn sums up all integration steps performed during one dT step. Thus, the higher the ratio dT/h is, the higher is the cycle time. A correction factor cannot be specified, however, because other factors as the size and type of the model contribute as well.

A CT block specified with Simulink, on the other hand, does not distinguish between dT and h, both have the same value. If such a CT block is imported into ASCET, you have no possibility to change the solver or h within the experiment. To obtain comparable cycle times for CT blocks specified with ASCET or Simulink, the integration step size of the Simulink model has to be chosen for both dT and h in the ASCET block.

See also

[The Monitoring Option](ProjectEditorEnglishUS.chm::/monitoringoption.htm)

[External Communication Interval dT](CTB_External_Communication_Interval_dT.md)

[Integration Step Size h](CTB_Integration_Step_Size_h.md)
