# Example: Computing Sequence

The figure below shows the computing sequence in a small CT structure block with coupled CT basic blocks. readInputs is not a method in its own right but belongs to directOutputs; it is shown to emphasize that current values have to be read first in order to compute the directOutputs method. The computing sequence is determined by the automatic sequencing algorithm. The numbers indicate the order of processing. Identical numbers mean that the execution sequence is arbitrary.

![](9908ct_sequencing_structure_ok.bmp)

The computing sequence is especially important for CT blocks with direct outputs (directOutputs method), because current values from the same iteration cycle have to be applied to the corresponding inputs (shaded sections in the above figure).

The CT blocks are processed from top to bottom. Furthermore, each method is executed sequentially one after the other. init is executed only once at the start of the simulation.

Within the integration loop (nondirectOutputs up to derivatives methods), all nondirectOutputs are always computed. Their sequence is not fixed. As the directOutputs method directly depends on the corresponding input, ASCET searches all directOutputs methods until the corresponding readInputs no longer depends on another directOutputs method (shaded section in the above figure). In the above figure, this is the case in CT basic block 3. This results in the following sequence for reading the inputs and executing the directOutputs method:

1. readInputs (CT block 3), directOutputs (CT block 3)
1. readInputs (CT block 4), directOutputs (CT block 4)
1. readInputs (CT block 1), directOutputs (CT block 1)
1. readInputs (CT block 2), directOutputs (CT block 2)

Only then the derivatives methods 1-4 are executed in arbitrary order. In case of a single-stage integration method, now follow the stateEvents methods for the CT blocks 1-4 in arbitrary order. Then again back to nondirectOutputs.

In case of n-stage integration methods, nondirectOutputs - directOutputs (as described above, in the correct order) and derivatives of CT blocks 1-4 are executed n times, before stateEvents is executed (see also [Execution Sequence of All Methods](CTB_Execution_Sequence_of_All_Methods.md)).

This means that the communication for combined CT basic blocks and/or CT structure blocks within one structure also occurs during the intermediate steps of the integration method. Each time, the nondirectOutputs up to derivatives methods are executed (single line frame).

The update method is executed after stateEvents only at the granularity of the communication interval dT and terminate only at the end of the simulation. For each, the computing sequence within the structure block is arbitrary.

There are therefore typically several equivalent computing sequences to solve a structure block. The sequencing algorithm of ASCET automatically selects one of the possible sequences.
