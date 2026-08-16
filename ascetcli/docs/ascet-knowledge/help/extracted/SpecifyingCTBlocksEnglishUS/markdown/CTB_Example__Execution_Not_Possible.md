# Example: Execution Not Possible

If there is an algebraic loop, the computing sequence cannot be determined automatically. This situation is shown in the figure below. Each input of a directOutputs method depends on another directOutputs, closing the loop from CT block 4 to CT block 1. This results in an appropriate error message.

![](9908ct_sequence_structure_alg_loop.bmp)
