# External Communication Interval dT

The communication interval is not part of the model but is chosen only at run-time of the simulation. The following communication occurs during the dT cycle:

- communication between CT blocks and the experiment environment, e.g., stimulation and visualization
- communication between CT blocks and controller modules within a hybrid project
- communication between several CT (structure) blocks within a hybrid project if several integration methods are used
- calling the update() method

see also

[Overview - Computing Sequence](ctb_overview_computing_sequence.md)

[Integration Step Size h](CTB_Integration_Step_Size_h.md)

[Step Size Depending on the Internal Integration Method: h/n](CTB_StepSize_Depending_on_Internal_IntegrationMethod_h_n.md)

[Execution Sequence of All Methods](CTB_Execution_Sequence_of_All_Methods.md)
