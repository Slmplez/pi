# Adding Sequence Calls to an Existing Sequence

It is possible to add normal or block-local sequence calls to a sequence which was defined earlier, i.e. to a number of sequence calls which have already been assigned to a runnable/method. In this case, the first of the newly assigned sequence calls receives a number which is one higher than the last one in the sequence defined earlier.

1. To assign normal sequence calls, do the following:
1. In the Tools menu, point to Sequence Calls, then point to Sequencing and select Appending.

The selected diagram part is analyzed, and the sequence calls are appended to the defined sequence for the selected runnable/method, in accordance with the integrated sequencing algorithm.

The sequencing algorithm is subject to several restrictions, see [Editing Several Sequence Calls](ascsequencecalls.md#EditingSeveral). It is therefore necessary that you proofread the automatic sequence call assignments, and correct them where necessary.

See also

[Automatically Assigning Sequence Calls](ASCassignSequence.md)

[Automatically Assigning Sequence Calls from a Specific Number](ascautomaticallyassign.md)

[Scaling Sequence Calls](ascscalesequence.md)

[Resetting Several Sequence Calls](ASCResetSequence.md)

[Editing a Sequence Call in the Sequence Editor](ASCEditSequence.md)

[Sequence Calls](ascsequencecalls.md)

[Block-Local Sequence Calls](asc_blocklocalsequencecalls.md)
