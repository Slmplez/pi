# Consistency Checks

The values inserted for the model or implementation are checked for consistency, together with the formula. The actions taken due to the results of the checks depend on the Automatically select the Implementation Type option (in the [Implementation](ComponentManagerEnglishUS.chm::/cm_implementation_node.htm) node of the ASCET options window).

- Automatically select the Implementation Type is activated
- Automatically select the Implementation Type is deactivated

## Automatically select the Implementation Type is Activated

1. If the model side is the master, the min. and max. values on the implementation side are adapted automatically using the formula.

If the input causes a larger interval in the Implementation column than the allowed range of the selected data type, the data type is adjusted automatically (exception: real* is selected as implementation data type). In doing so, the first data type suitable for the interval is selected.

Example: If the type uint8 has been entered in the Implementation column, and the interval [-100..255] results from the Model settings, the type int16 is chosen instead.

The sizes of the data types are assumed according to the following sequence:

int8 , uint8 , int16 , uint16 , int32, uint32

If even uint32 is too small, the following messages are issued in the Consistency field of the implementation editor (even though the element is of model type cont and the implementation data types real32 and real64 are available).

![](icon_error.gif) Model value exceeds limits. No matching implementation data type available.

![](icon_info.gif) [<min>,<max>] taken as physical interval due to quantization.

If you answer the error message with Auto Correction, a value is inserted on the master page. The value is chosen to ensure that the implementation side, after the automatic update, uses the maximum value for one of the 32 bit integer formats. If you click on Cancel, the dialog is closed and the original settings are restored.

If a smaller interval is selected on the Model side later, the implementation data type is scaled down again, if appropriate.

1. If the implementation side is the master, the values on the model side are adapted automatically using the formula.

When creating an element, it receives the default type set in the ASCET options (see [Default Implementation Types Options](componentmanagerenglishus.chm::/cm_defaultimplementationtypes.htm)) at first. If the user enters a bigger interval in the Implementation column than the data type allows, the data type is adjusted automatically. In this case, the smallest data type fitting the interval is selected. In contrast, however, no automatic adjustment is done if the user enters an interval, which would permit smaller data types.

Example: If for a cont element the type uint8 is selected in the Implementation column and

1. The user enters the interval [-100..255], the int16 type will be selected automatically instead.
1. The user enters the interval [0..100], the uint8 type will be kept.

For the sizes of the data types, again the following order is assumed:

int8 , uint8 , int16, uint16, int32, uint32

If even uint32 is too small, the maximum value for one of the 32 bit integer formats will be used automatically without generating an error or a warning.

1. If the new value conflicts with one of the other values, for instance if the new minimum value is greater than the maximum value, an error message will be shown, which you can acknowledge with Auto Correction or Cancel.
1. If the implementation is the master, and if you edit an element with model data type udisc and implementation data type int*, an error message is issued when you enter negative values for the implementation interval.
1. If the computed min and max values differ from the stored values, the system assumes the current formula as cause of the error. The following error message is shown:

![](icon_error.gif) Values for min/max are not consistent with current formula.

This happens, e.g. when you edit a formula in the project, but do not update the implementations afterwards (see [Global Changes in Implementations](ProjectEditorEnglishUS.chm::/Globalchanges.htm)).

## Automatically select the Implementation Type is Activated

The same consistency checks are performed, but the implementation data type is not updated automatically.

See also

[ASCET Options Window - Implementation Options](ComponentManagerEnglishUS.chm::/CM_Implementation_Node.htm)

[ASCET Options Window - Default Implementation Types Options](componentmanagerenglishus.chm::/cm_defaultimplementationtypes.htm)

[Project Editor - Global Changes in Implementations](ProjectEditorEnglishUS.chm::/Globalchanges.htm)
