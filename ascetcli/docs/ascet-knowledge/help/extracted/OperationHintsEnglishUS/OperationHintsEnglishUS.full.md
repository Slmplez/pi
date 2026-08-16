# Merged CHM Content

## Operation Hints - Overview

_Source: `markdown/OH_OperationHints_Overview.md`_

# Operation Hints - Overview

This part of the ASCET online help contains several hints for working with ASCET.

See also

[Staged Build Settings](markdown/OH_Staged_Build_Settings.md)

[Operation Using the Keyboard](markdown/Operation_Using_the_Keyboard.md)

[Keyboard Control](markdown/OH_KeyboardControl.md)


---

## Staged Build Settings

_Source: `markdown/OH_Staged_Build_Settings.md`_

# Staged Build Settings

The ASCET build process consists of several steps. Normally, these steps are executed one after the other, without breaks. If necessary, you can interrupt the build process on several pre-defined points.

For this purpose, the global_settings.mk file (available in the target directory of each target installed on your PC) contains the variable ASD_PAUSE_MODE.

#############################################################################

## only for debug purpose of make process; this variable can be set to TRUE,

## to cause gmake to make a pause after each relevant build stage.

#############################################################################

ASD_PAUSE_MODE=TRUE

If this switch is set to TRUE, the build process pauses at pre-defined points.

See also

[Using Staged Build Settings](markdown/OH_Use_Staged_Build.md)


---

## Using Staged Build Settings

_Source: `markdown/OH_Use_Staged_Build.md`_

# Using Staged Build Settings

To work with staged build, proceed as follows.

1. Go to the target directory of the target you are using (e.g., ...\target\PC for an offline experiment).
1. Open the global_settings.mk file in a text editor.
1. Set ASD_PAUSE_MODE to TRUE and save the file.
1. In ASCET, start the Build process.

At each breakpoint, the ASCET_PAUSE_MODE message window opens. It names the completed build stage.

1. Confirm the message with OK to continue the build process.

The build process continues until the next breakpoint.

Or

1. In the ASCET monitor window, click on Cancel to stop the build process.

See also

[Staged Build Settings](markdown/OH_Staged_Build_Settings.md)


---

## Operation Using the Keyboard

_Source: `markdown/Operation_Using_the_Keyboard.md`_

The WINDOWS® conventions apply to the general operation of ASCET, such as navigating through menus or activating a specific window.

Pressing the underlined letter in a menu while holding down the Alt key activates the corresponding command. You can activate a subordinate menu command by pressing the underlined letter together with the Shift key.

For example, to open the File menu in Component Manager with a keyboard command, press the Alt + f key combination.

To switch to the next window or list box within the working windows, press the Tab key (in the order from top left to bottom right). As an alternative, you can use Alt key and the underlined character (number or letter) of the field or list label to switch to the corresponding field or list box.

The arrow keys allow you to skip to the next item in list boxes. You can select multiple items by making your selection while pressing the Shift key.

According to the WINDOWS® conventions, you can switch between the working windows using the keyboard shortcut Alt + Tab. In this sense, all subsystems of ASCET, such as the component editors, the experiment environment, or implementation or data editor, are treated as individual applications.

If you need Tab within the window for other functions, e.g. when editing text, you can switch to the next window element using the keyboard shortcut Ctrl + Tab.

Switching between several tabs in a window or field (e.g. in the Component Manager, 3 Contents field) is done—pursuant to the MS-WINDOWS® convention—by pressing the Ctrl + Tab key combination.

Within a window, you can use the underlined letter of the box or list title, while holding down the Alt key, to switch to the corresponding list box. For example, Alt + 2 would activate the 2 Comment text field.

# Operation Using the Keyboard

Simple operation using the keyboard has been emphasized during the development process of ASCET. Individual keys are preferred over the function keys F1 to F12, which in turn are preferred over keyboard shortcuts using Ctrl and Alt. You can display a complete overview of the keyboard commands currently used at any time by pressing Ctrl + F1.

[Keyboard Control according to the Windows Conventions](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

See also

[Keyboard Control](markdown/OH_KeyboardControl.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="markdown/images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="markdown/images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="markdown/images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](markdown/+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }


---

## Keyboard Control

_Source: `markdown/OH_KeyboardControl.md`_

# Keyboard Control

- [Keyboard Commands in the Component Manager](markdown/keyboard_commands_comp_manager.md)
- [Keyboard Commands in the Monitor Window](markdown/keyboard_commands_monitor_window.md)
- [Keyboard Commands in the Editors](markdown/OH_KeyboardCommands_Editors.md)
- [Keyboard Commands in the Offline Experiment Environment](markdown/keyboard_commands_offline.md)
- [Measure and Calibration Windows in General](markdown/measure_calibration_windows_general.md)
- [Keyboard Commands in Measure Windows](markdown/OH_measure_windows.md)
- [Keyboard Commands in Calibration Windows](markdown/OH_calibration_windows.md)


---

## Keyboard Commands in the Component Manager

_Source: `markdown/keyboard_commands_comp_manager.md`_

# Keyboard Commands in the Component Manager

The following special keyboard commands are available in the Component Manager:

Ctrl + n

Creates a new database.

Ctrl + shift + n

Creates a new workspace.

Ctrl + o

Opens database/workspace.

Ctrl + s

Saves database/workspace.

Ctrl + e

Activates the export function.

Ctrl + m

Activates the import function.

Alt + F4

Closes Component Manager and exits ASCET.

F2

Renames selected object.

Ctrl + f

Searches a string in C code or ESDL components.

Ctrl + h

Replace a string in C code or ESDL components

Ctrl + q

Searches the database/workspace from various points of view.

F5

Updates Component Manager display.

Insert

Inserts folder / inserts object in container.

Return

Opens editor for selected database/workspace object.

Alt + 1

Switches to the 1 Database / 1 Workspace field.

Alt +2

Switches to the 2 Comment field.

Alt +3

Switches to the 3 Contents field.

Alt + F6

Switches to the next window.

Esc

Cancels cut.


---

## Keyboard Commands in the Monitor Window

_Source: `markdown/keyboard_commands_monitor_window.md`_

# Keyboard Commands in the Monitor Window

The following special keyboard commands are available in the ASCET monitor window:

Ctrl + o

Opens log file for the Monitor tab.

Ctrl + s

Save the content of the Monitor tab to a file.

Ctrl + f

Finds/replace text in the Monitor tab.

Ctrl + r

Deletes text in the Monitor tab.

Ctrl + +

Enlarges monitor window.

Ctrl + -

Scales down monitor window.


---

## Keyboard Commands in the Editors

_Source: `markdown/OH_KeyboardCommands_Editors.md`_

# Keyboard Commands in the Editors

- [Keyboard Commands in the Block Diagram / State Machine Editors](markdown/keyboard_commands_editors.md)
- [Keyboard Commands in the C Code / ESDL Editors](markdown/Keyboard_Commands_in_the_C_Code___ESDL_Editors.md)
- [Keyboard Commands in the AS Editor](markdown/Keyboard_Commands_in_the_AS_Editor.md)
- [Keyboard Commands in the Data / Implementation Editors for Components and Projects](markdown/Keyboard_Commands_in_the_Data___Implementation_Editors_for_Components_and_Projects.md)


---

## Keyboard Commands in the Block Diagram / State Machine Editors

_Source: `markdown/keyboard_commands_editors.md`_

# Keyboard Commands in the Block Diagram / State Machine Editors

The following special keyboard commands are available in the block diagram / state machine editor:

F2

Renames selected element.

Ctrl + Cursor right

Shows next sequence call.

Ctrl + Cursor left

Shows previous sequence call.


---

## Keyboard Commands in the C Code / ESDL Editors

_Source: `markdown/Keyboard_Commands_in_the_C_Code___ESDL_Editors.md`_

# Keyboard Commands in the C Code / ESDL Editors

The following special keyboard commands are available in the C Code and ESDL editors:

Ctrl + f

Finds/replaces.

Ctrl + s

Save methods/process.


---

## Keyboard Commands in the AS Editor

_Source: `markdown/Keyboard_Commands_in_the_AS_Editor.md`_

# Keyboard Commands in the AS Editor

The following special keyboard commands are available in the AS editor:

Ctrl + n

Creates a new file.

Ctrl + o

Opens a file.

Ctrl + s

Saves the currently edited file.


---

## Keyboard Commands in the Data / Implementation Editors for Components and Projects

_Source: `markdown/Keyboard_Commands_in_the_Data___Implementation_Editors_for_Components_and_Projects.md`_

# Keyboard Commands in the Data / Implementation Editors for Components and Projects

The following special keyboard commands are available in the data and implementation editors for components/projects:

Alt + c, Alt + o

Closes the editor window.

F2

Renames selected data set/implementation.


---

## Keyboard Commands in the Offline Experiment Environment

_Source: `markdown/keyboard_commands_offline.md`_

# Keyboard Commands in the Offline Experiment Environment

The following special keyboard commands are available in the offline experiment environment:

Alt + F4

Closes offline experiment environment.

F10

Activates the main menu.

Ctrl + c

Calibrates element.

Ctrl + m

Measures element.

Ctrl + s

Stimulates element.

Ctrl + l

Activates recording of selected elements in the Data Logger.

Ctrl + a

Activates recording of all elements in the Data Logger.

Ctrl + i

Views the implementation of an element.

Ctrl + u

Updates dependent parameters.


---

## Measure and Calibration Windows in General

_Source: `markdown/measure_calibration_windows_general.md`_

# Measure and Calibration Windows in General

The keyboard commands listed below equally apply to all measure and calibration windows. For specific keyboard commands for individual measure and calibration windows, please see further below.

Ctrl + h

Displays hexadecimal values in the active window.

Ctrl + i

Displays information on the selected variable.

Ctrl + p

Displays physical values in the active window.

Ctrl + s

Opens the display setup for the active window (except 3D graphical editor).

Del

Deletes a variable from the active window (except graphical and numerical table editors).

See also

[Keyboard Commands in Calibration Windows](markdown/OH_calibration_windows.md)

[Keyboards Commands in Measure Windows](markdown/OH_measure_windows.md)


---

## Keyboard Commands in Measure Windows

_Source: `markdown/OH_measure_windows.md`_

# Keyboard Commands in Measure Windows

The following keyboard commands are - in addition to those in [Measure and Calibration Windows in General](markdown/measure_calibration_windows_general.md) - available in all measure windows:

Ctrl + c

Copies the settings of the current measure window to the clipboard.

Ctrl + w

Copies the settings from the clipboard to the current measure window.

See also

[Measure and Calibration Windows in General](markdown/measure_calibration_windows_general.md)

[Keyboard Commands in Numerical Display/Bit Display/Bar Display](markdown/Keyboard_Commands_in_Numerical_Display_Bit__Display_Bar_Display.md)

[Keyboard Commands in Oscilloscope and Recorder](markdown/Keyboard_Commands_in_Oscilloscope_and_Recorder.md)


---

## Keyboard Commands in Numerical Display/Bit  Display/Bar Display

_Source: `markdown/Keyboard_Commands_in_Numerical_Display_Bit__Display_Bar_Display.md`_

# Keyboard Commands in Numerical Display/Bit Display/Bar Display

The following keyboard commands are available in the numerical display, bit display, and horizontal and vertical bar display:

Ctrl + Page up

Moves the highlighted variable in a window one position down (vertical bar display: to the left).

Ctrl + Page down

Moves the highlighted variable in a window one position up (vertical bar display: to the right).

The following keyboard commands are only available in the numerical display:

Ctrl + z

Displays decimal values in the active window.

Ctrl + r

Displays binary values in the active window.

See also

[Keyboard Commands in Measure Windows](markdown/OH_measure_windows.md)


---

## Keyboard Commands in Oscilloscope and Recorder

_Source: `markdown/Keyboard_Commands_in_Oscilloscope_and_Recorder.md`_

# Keyboard Commands in Oscilloscope and Recorder

The following keyboard commands are only available in the oscilloscope and recorder window:

Ctrl + a

Adapts the Y-axis scaling for the selected measuring channel.

Ctrl + u

Undoes the last scaling.

Ctrl + l

Shows/hides the measuring channel list.

Ctrl + x

Shows/hides the selected variable.

Ctrl + v

Activates/deactivates the analysis mode.

Ctrl + g

Shows/hides display grid (oscilloscope only).

t

Releases the trigger event manually.

Page down

Selects the last channel in the Measure channels or Bit channels list.

Page up

Selects the first channel in the Measure channels or Bit channels list.

Cursor left, Cursor right

Move selected measure cursor in single steps (analysis mode only).

Ctrl + Cursor left, Ctrl + Cursor right

Move selected measure cursor several steps at once (analysis mode only).

See also

[Keyboard Commands in Measure Windows](markdown/OH_measure_windows.md)


---

## Keyboard Commands in Calibration Windows

_Source: `markdown/OH_calibration_windows.md`_

# Keyboard Commands in Calibration Windows

The following keyboard commands are—in addition to those in [Measure and Calibration Windows in General](markdown/measure_calibration_windows_general.md) —available in all calibration windows:

Ctrl + m

Increments selected values (except 3D graphical editor).

Ctrl + n

Decrements selected values (except 3D graphical editor).

Ctrl + d

Repeats the last action.

Ctrl + u

Undoes the last action.

The following keyboard commands are only available in the numerical editor:

Ctrl + r

Displays binary values.

Ctrl + z

Displays decimal values.

Ctrl + Page up

Moves the highlighted variable in a window one position down.

Ctrl + Page down

Moves the highlighted variable in a window one position up.

See also

[Measure and Calibration Windows in General](markdown/measure_calibration_windows_general.md)

[Keyboard Commands in the Table Editor](markdown/Keyboard_Commands_in_the_Table_Editor.md)

[Keyboard Commands in the 1D/2D Graphical Editors](markdown/Keyboard_Commands_in_the_1D_2D_Graphical_Editors.md)

[Keyboard Commands in the 3D Graphical Editor](markdown/Keyboard_Commands_in_the_3D_Graphical_Editor.md)


---

## Keyboard Commands in the Table Editor

_Source: `markdown/Keyboard_Commands_in_the_Table_Editor.md`_

# Keyboard Commands in the Table Editor

The following keyboard commands are only available in the table editor:

+

Adds offset to selected values.

*

Multiplies selected values by a factor.

=

Fills selected cells with a value.

Ctrl + j

Decrements the x-axis value (only characteristic line/map).

Ctrl + k

Increments the x-axis value (only characteristic line/map).

Ctrl + r

Decrements the y-axis value (only characteristic map).

Ctrl + t

Increments the y-axis value (only characteristic map).

Ctrl + x

Assigns a specific value to the x-axis point (only characteristic line/map).

Ctrl + y

Assigns a specific value to the y-axis point (only characteristic map).

See also

[Keyboard Commands in Calibration Windows](markdown/OH_calibration_windows.md)


---

## Keyboard Commands in the 1D/2D Graphical Editors

_Source: `markdown/Keyboard_Commands_in_the_1D_2D_Graphical_Editors.md`_

# Keyboard Commands in the 1D/2D Graphical Editors

The following keyboard commands are only available in the 1D or 2D graphical editor:

x

Switches to the xz representation (2D Map Editor only).

y

Switches to the yz representation (2D Map Editor only).

z

Reverses x (y)-axis and z-axis.

Ctrl + b

Allows several values on the curve to be selected.

See also

[Keyboard Commands in Calibration Windows](markdown/OH_calibration_windows.md)


---

## Keyboard Commands in the 3D Graphical Editor

_Source: `markdown/Keyboard_Commands_in_the_3D_Graphical_Editor.md`_

# Keyboard Commands in the 3D Graphical Editor

The following keyboard commands are only available in the 3D graphical editor:

Cursor left, Cursor right

Rotation around z-axis.

Cursor up, Cursor down

Rotation around horizontal axis.

num 4, num 6

Rotation around z-axis.

num 8, num 2

Rotation around horizontal axis.

See also

[Keyboard Commands in Calibration Windows](markdown/OH_calibration_windows.md)


---

