# Integration Step Size h

The integration step size is not part of the model but chosen only at run-time of the simulation. During the h cycle, communication takes place between several continuous time blocks within a continuous time structural block. After the integration step has been executed across all blocks, the stateEvents() method is executed.

Each value transferred is numerically acknowledged and depends on the selected integration method. When simulating a highly dynamic model for which h has to be very small, the speed can be considerably increased by selecting a much higher value for dT than for h.

See also

[Overview - Computing Sequence](ctb_overview_computing_sequence.md)

[External Communication Interval dT](CTB_External_Communication_Interval_dT.md)

[Step Size Depending on the Internal Integration Method: h/n](CTB_StepSize_Depending_on_Internal_IntegrationMethod_h_n.md)

[Execution Sequence of All Methods](CTB_Execution_Sequence_of_All_Methods.md)
