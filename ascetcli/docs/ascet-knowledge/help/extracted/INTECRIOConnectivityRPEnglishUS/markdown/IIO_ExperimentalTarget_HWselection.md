generic term for target 1130 or ES1135

# Experimental Target Hardware Selection Window

The Experimental Target Hardware Selection window contains the following elements:

Select Simulation Board field

This field displays, below the main entry HWC (symbol ![](icon_hwc.gif)), all simulation controllers ([ES113x](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('HotSpot11476'); //-->, ES910 or RTPRO-PC – symbol ![](icon_es11xx.gif)) connected with the PC.

The simulation controller label contains, in addition to the controller name, further information; see page 15. Available ES1000 boards (symbol ![](icon_boards.gif)) are displayed below the simulation controller; the ES910 and RTPRO-PC interfaces are not visible in this window. See [Examples: Targets in the Hardware Selection Window](IIO_Examples_Targets_in_HWselectionWindow.md) for details on the simulation controller labels.

For the experiment, select the simulation controller you have entered in the code generation options of your project.

Skip HW Selection if Exactly one Matching Target Instance Found and Skip HW Selection if Last Used Target Instance Found

These options offer the same functionality as the identical options in the [Hardware Connection](ComponentManagerEnglishUS.chm::/CM_Hardware_Options.htm) node of the ASCET options window.

The settings performed here are transferred to the Hardware Connection node and vice versa.

![](BUTTON.GIF) Set Alias Name

You can use this button to assign an arbitrary name to the ES113x or ES1120 or ES910 or RTPRO-PC.

![](BUTTON.GIF) Refresh

This button updates the Select simulation board of type <type> field.

Hardware newly connected or switched on is displayed afterwards, hardware that was removed or switched off, disappears from the display.

![](BUTTON.GIF) OK and Cancel

Click OK to accept the selection, or Cancel to close the hardware selection window without accepting the selection.

See also

[Examples: Targets in the Hardware Selection Window](IIO_Examples_Targets_in_HWselectionWindow.md)

[Hardware Options](ComponentManagerEnglishUS.chm::/CM_Hardware_Options.htm)
