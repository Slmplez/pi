# Adding Sequence Calls to an Existing Sequence

It is possible to add normal or block-local sequence calls to a sequence which was defined earlier, i.e. to a number of sequence calls which have already been assigned to a process/method or statement block. In this case, the first of the newly assigned sequence calls receives a number which is one higher than the last one in the sequence defined earlier.

1. To assign normal sequence calls, do the following:
1. To assign block-local sequence calls, do the following:
1. In the Tools menu, point to Sequence Calls, then point to Sequencing and select Appending.

The selected diagram part is analyzed, and the sequence calls are appended to the defined sequence for the selected process/method, in accordance with the integrated sequencing algorithm.

The sequencing algorithm is subject to several restrictions, see [Editing Several Sequence Calls - Restrictions](Editingsequence.md#Sequencing_restrictions). It is therefore necessary that you proofread the automatic sequence call assignments, and correct them where necessary.

See also

[Editing Several Sequence Calls](Editingsequence.md)

[Automatically Assigning Sequence Calls](AssignSequence.md)

[Automatically Assigning Sequence Calls from a Specific Number](BDE_AutomaticallyAssign.md)

[Scaling Sequence Calls](ScaleSequence.md)

[Resetting Several Sequence Calls](ResetSequence.md)

[Editing a Sequence Call in the Sequence Editor](EditSequence.md)

[Sequence Calls](BDE_SequenceCalls.md)

[Block-Local Sequence Calls](BDE_BlockLocal_SequenceCalls.md)
