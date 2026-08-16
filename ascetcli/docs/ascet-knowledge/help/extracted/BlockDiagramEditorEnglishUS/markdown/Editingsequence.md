# Editing Several Sequence Calls

A large number of sequence calls may be necessary in complex diagrams. In that case, the possibilities to edit sequence calls in groups can be helpful. You can edit all sequence calls in a selected part of the diagram, all sequence calls assigned to a selected method/process, or all sequence calls in a complete diagram.

The sequencing algorithm uses a logical model graph that is computed from the inputs and outputs of all graphical elements. The algorithm tries to find dependencies between the graphical elements, but severe restrictions apply.

- independent subgraphs

One diagram can have several independent subgraphs. The order the sequencing algorithm assigns to the independent subgraphs cannot be predicted.

Example:

![](EditSequenceCalls_01.gif)

The sequencing algorithm will notice that the addition d = a + c has to be computed last because it depends on the results of the additions a = b + 1 and c = b + 2. Therefore, the addition d = a + c will be assigned the highest sequence number. However, the algorithm cannot decide whether a or c needs to be computed first. The lowest sequence number is assigned arbitrarily either to a = b + 1 or to c = b + 2.

- control flow elements

If the branch of a control flow element is connected to more than one action, the sequencing algorithm cannot decide which action has to be computed first. The sequence numbers of the connectors are assigned arbitrarily.

Example: [If statement](UseIf.md)

![](EditSequenceCalls_02.gif)

Even though the lower action on the Then branch, b = b + a, depends on the upper action a = 1.0, the sequencing algorithm may assign the lower sequence number to b = b + a.

- several methods/processes

One diagram can contain several methods or processes. Elements that belong to a method or process (i.e. arguments, return values, method-/process-local variables) can be used only in that particular method or process, but all other elements (i.e. variables, messages, ...) can be computed in any method or process. For these elements, the sequencing algorithm tries to determine a method/process by checking whether the inputs/outputs of a computation chain belong to a particular method/process. If that check fails, any method/process can be used.

Example: a class with three methods (compute, reset, out)

![](EditSequenceCalls_03.gif)

- Sequence call A can only be assigned to the reset method because the initValue argument is not available in the other methods. If another method is selected for sequencing, this sequence call remains empty.
- Sequence call B can only be assigned to the out method. If another method is selected for sequencing, this sequence call remains empty.
- Sequence call C can only be assigned to the compute method. If another method is selected for sequencing, this sequence call remains empty.
- Sequence call D can only be assigned to the compute method because the local variable locvar argument is not available in the other methods. If another method is selected for sequencing, this sequence call remains empty.
- Sequence call E does not belong to a particular method. It will be assigned to whichever method is selected for sequencing.

See also

[Automatically Assigning Sequence Calls](AssignSequence.md)

[Automatically Assigning Sequence Calls from a Specific Number](BDE_AutomaticallyAssign.md)

[Adding Sequence Calls to an Existing Sequence](AddSequence.md)

[Shifting Several Sequence Calls](ShiftSequence.md)

[Scaling Sequence Calls](ScaleSequence.md)

[Resetting Several Sequence Calls](ResetSequence.md)

[Changing the Visibility of Several Sequence Calls](ChangeSequence.md)
