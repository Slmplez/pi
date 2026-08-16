# Specifying Rescalable Implementations

To specify [rescalable implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm), you have to

- [adjust the implementations of basic elements in a component](#AdjustingBasic)

and then

- [specify a rescaling formula for each component instance in your project.](#SpecifyingRescaling)

Proceed as follows.

##### Adjusting the implementations of basic elements

1. Open the component whose elements need a rescalable implementation.
1. For each element that needs a rescalable implementation, do the following.

1. [Open the implementation editor for the element](IEd_open_impleditor_for_element.md).
1. In the implementation editor, activate the Rescalable option.
1. [Select a linear formula](IEd_select_formula.md) with positive scale and zero offset.
1. [Set the master page](set_masterpg_impl.md) to Implementation.
1. Select an sint* or uint* implementation data type.
1. Close the implementation editor with OK.

##### Specifying a rescaling formula for a component instance

For each instance of the component in your project, do the following.

1. Open the parent component of the instance.
1. Make sure that the instance is of scope local.
1. [Open the implementation editor for the parent component.](IEd_open_impl.md)
1. In the implementation editor, [select an implementation](IEd_select_impl.md).
1. In the Local tab, in the row of the instance, click in the Rescaling Formula cell.
1. Select a linear formula with positive scale and zero offset.
1. Close the implementation editor with OK.

See also

[Rescalable Implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm)

[Elements with Rescalable Implementations](IntroductionEnglishUS.chm::/INT_ElementsRescalableImpl.htm)

[Opening the Implementation Editor for an Element (B)](IEd_open_impleditor_for_element.md)

[Selecting a Formula](IEd_select_formula.md)

[Setting the Master Page of an Implementation](set_masterpg_impl.md)

[Specifying an Implementation (Master: Implementation)](specify_impl-master.md)

[Opening the Implementation Editor of an Edited Component/Project](IEd_open_impl.md)

[Selecting an Implementation](IEd_select_impl.md)

[Project Editor - Transformation Formulas](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm)
