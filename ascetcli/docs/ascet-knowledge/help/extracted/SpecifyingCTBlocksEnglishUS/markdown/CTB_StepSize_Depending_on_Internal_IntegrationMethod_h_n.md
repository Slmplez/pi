# Step Size Depending on the Internal Integration Method: h/n

Other than the h cycle, the h/n cycle depends on the selected integration method; e.g., the Euler integration method uses the cycle time h/l while the Heun integration method uses h/2

During the h/n cycle, the intermediate steps of the integration are calculated. As for the h cycle, communication takes place between the continuous time blocks of a continuous time structure block. The intermediate steps of the integration cannot be communicated to the outside.

Numerically, no discontinuities can be handled during this cycle since the stateEvents() method is not called during this cycle.

There is the following relationship between the different step sizes:

dT >= h >= h/n

The entire cycle of the various method calls is depicted in the figure below:

![](dia0085.gif)

The events() and dependentParameters() methods are only called when an explicit, asynchronous event occurs, and especially not during a dT cycle.

See also

[Overview - Computing Sequence](ctb_overview_computing_sequence.md)

[External Communication Interval dT](CTB_External_Communication_Interval_dT.md)

[Integration Step Size h](CTB_Integration_Step_Size_h.md)

[Execution Sequence of All Methods](CTB_Execution_Sequence_of_All_Methods.md)
