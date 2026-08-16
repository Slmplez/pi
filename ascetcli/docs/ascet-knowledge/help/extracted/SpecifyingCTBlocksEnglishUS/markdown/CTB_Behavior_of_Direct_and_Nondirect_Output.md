# Behavior of Direct and Nondirect Output

The nondirectOutputs and directOutputs methods essentially determine the behavior of the CT basic blocks and the computing sequence in a CT structure block. This is illustrated again in the following example.

![](dia0081.gif)

In general, an output has a direct pass-through behavior if it directly depends on one of the inputs. For example, an amplifier block (p behavior) is described by the function:

out = K * in

The output directly depends on the input. Consequently, the inputs have to be read first before the output can be calculated. The function must be written using the directOutputs method.

If the output does not depend on one of the inputs, for example, if the output depends on a continuous state or a parameter condition, it does not have direct pass-through behavior. Nondirect outputs are calculated from the values of the previous step. A CT block having a direct output terminates an existing loop. An example is the so-called PT1 behavior:

x’ = ((K*in - x)/T);

out = x;

The differential equation is solved using an integration method that requires the last output value and the input value in to calculate the current output value x. The assignment out=x has to be written using the nondirectOutputs method (the differential equation is discussed in the derivatives method).

Two simple examples illustrate a correct and an incorrect coupling of two CT basic blocks with direct and nondirect output within a CT structure block. It is essential to understand that a direct output requires the input data of the current time step. A nondirect output can be calculated and sent without the input information of the current time step. Therefore, the direct outputs are calculated after the nondirect outputs.

The figure below shows a combination of two CT blocks with direct and nondirect pass-through behavior that does not cause an algebraic loop.

![](dia0082.gif)

The P block requires a valid input value for its calculation. Consequently, the nondirectOutputs method in the PT1 block has to be calculated first and then the directOutputs method in the P block.

![](dia0083.gif)

In the above figure, two CT blocks with direct outputs are connected in series. This results in an algebraic loop. Each block requires the current output value of the other block. ASCET reports this error.

Direct pass-through circuits must be avoided. However, it is not possible to resolve algebraic loops automatically and implicitly because an implicit resolution of algebraic loops requires an iterative method, which is not acceptable under real-time conditions.

An advantage over the automatic resolution of an algebraic loop is that the user, knowing his model, can insert a block without a direct output at the most appropriate position so the subsequent blocks can be computed in the next iteration step.

In principle, there are two alternatives to avoid algebraic loops:

1. Inserting a block without a direct output. As this corresponds to a storage element, the integration step size may have to be decreased to avoid that the dynamics of the model is impaired.
1. Modifying the model structure to eliminate the algebraic loop. Reformulating the equations in the CT basic blocks, modifying the structure.

See also

[Continuous Time Structure Blocks](CTB_Continuous_Time_Structure_Blocks.md)

[Reuse of Structure Blocks](ctb_reuse_of_structure_blocks.md)

[Elements of a Continuous Time Structure Block](CTB_Elements_of_a_Continuous_Time_Structure_Block.md)

[Operators](CTB_Operators.md)

[Algebraic Loops](CTB_Algebraic_Loops.md)

[Summary - Direct and Nondirect Output](CTB_Summary_Direct_and_Nondirect_Output.md)

[Difference Between Graphical Hierarchies and CT Structure Blocks](CTB_Difference_GraphicalHierarchies_CTStructureBlocks.md)

[Computing Sequence of Methods Within a Structure](CTB_Computing_Sequence_of_Methods_Within_a_Structure.md)
