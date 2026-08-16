# Merged CHM Content

## Overview

_Source: `markdown/SI_Overview.md`_

# Overview

This part of the ASCET online help describes how to work with signals and icons in the ASCET database or workspace. Signals and icons are supplementary data for a control system that can be stored together with the system itself in the ASCET database or workspace.

Both signals and icons can be imported into the database or workspace or exported to the file system. Signals are used by the system, icons can be assigned to elements and hierarchies. The following links explain how to work with each type of item.

See also

[Signal Viewer](markdown/SI_signal_viewer.md)

[Icon Editor](markdown/SI_icon_editor.md)


---

## Signal Viewer

_Source: `markdown/SI_signal_viewer.md`_

# Signal Viewer

With the signal viewer signals can be loaded into the ASCET database or workspace and viewed. The viewer can read a variety of signal formats and convert signals between formats.

The following measurement data formats are supported by ASCET:

- Tab delimited ASCII. Almost every spreadsheet or database can read and write in this format.
- FAMOS Channel Format.
- FAMOS Record Format.
- Matlab Source Code Format (i.e., *.m).
- MDF V2.00 Format.

ASCET can import MDF V2.* and MDF V3.* files, but the enhancements of higher versions are ignored.

The last four are third-party formats for measurement data. Please refer to the relevant documentation for details. Internally, ASCET can process the ASCII format and both types of FAMOS format. MDF and Matlab source code format can be read and written.

See also

[Creating a Signal](markdown/SI_Creating_a_Signal.md)

[Opening a Signal](markdown/SI_create_open_signal.md)

[Importing Measurement Data to a Signal](markdown/SI_import_measurement_data.md)

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)

[Exporting a Signal](markdown/SI_Exporting_Signal.md)


---

## Icon Editor

_Source: `markdown/SI_icon_editor.md`_

# Icon Editor

Icons can be assigned to the layout of components. The icon is shown in the graphical block, when the component is included in other components in the block diagram editor. A selection of icons is provided with ASCET, and you can also create your own.

See also

[Creating an Icon](markdown/SI_Creating_Icon.md)

[Starting the Icon Editor](markdown/SI_start_icon_editor.md)

[Loading a Bitmap](markdown/SI_load_icon.md)

[Scaling an Icon](markdown/SI_scale_icon.md)

[Saving an Icon to a File](markdown/SI_save_icon.md)


---

## Creating a Signal

_Source: `markdown/SI_Creating_a_Signal.md`_

# Creating a Signal

To create a new signal, proceed as follows:

1. In the Component Manager, select the folder where you want to add the new signal.
1. Do one of the following:

- In the Insert menu, select Signal.
- Press Ctrl + Alt + g.
- In the context menu, point to Insert and select Signal.

A new signal is created. You can open it in the signal viewer.

See also

[Opening a Signal](markdown/SI_create_open_signal.md)

[Importing Measurement Data to a Signal](markdown/SI_import_measurement_data.md)

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)


---

## Opening a Signal

_Source: `markdown/SI_create_open_signal.md`_

# Opening a Signal

To open a signal, proceed as follows:

1. In the Component Manager, select a signal.
1. Do one of the following:

- Double-click on the signal.
- In the Edit menu, select Open Component.
- Press Return.
- In the context menu, select Open Component.

The signal viewer opens. You can import measurement data to the signal, view and export signal data.

See also

[Importing Measurement Data to a Signal](markdown/SI_import_measurement_data.md)

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)

[Exporting a Signal](markdown/SI_Exporting_Signal.md)


---

## Importing Measurement Data to a Signal

_Source: `markdown/SI_import_measurement_data.md`_

# Importing Measurement Data to a Signal

To import measurement data to a signal, proceed as follows:

1. [Open the signal](markdown/SI_create_open_signal.md) in the signal viewer.
1. In the signal viewer, open the File menu, point to Store Imported Data In and select <format> Format for the internal storage of the signal data.
1. Open the File menu and select Import.
1. Select the path and file name of the data file you want to import and click on Open.
1. In the message window, do the following.

The data is imported and automatically converted to the specified format. After conversion, the data is displayed in the viewer.

See also

[Opening a Signal](markdown/SI_create_open_signal.md)

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)

[Signal Viewer](markdown/SI_signal_viewer.md)

[Component Manager - Confirmation Dialogs Node](ComponentManagerEnglishUS.chm::/CM_Options_for_Confirmation_Dialogs.htm)


---

## Viewing Measurement Data

_Source: `markdown/SI_view_measurment_data.md`_

# Viewing Measurement Data

To view measurement data, proceed as follows:

1. In the Navigation menu, select Next Sample to move to the next data column.
1. Click the ![](markdown/button_shownext.gif) button.
1. In the Navigation menu, select Next Sample Set to move to the next screenful of data.
1. Click the ![](markdown/button_ff.gif) button.
1. In the Navigation menu, select Last Sample to move to the last data column.
1. Click the ![](markdown/button_showlast.gif) button.

For each of these three commands there is an equivalent command or button for moving in the opposite direction.

![](markdown/buttons_sigview_back.gif)


---

## Exporting a Signal

_Source: `markdown/SI_Exporting_Signal.md`_

# Exporting a Signal

To export a signal to a file, proceed as follows:

1. [Open the signal](markdown/SI_create_open_signal.md) in the signal viewer.
1. In the signal viewer, open the File menu, point to Export and select <format> Format to export the signal data to the file system.
1. Select the path and file name of the export file.
1. Click on Save.

The data is exported to the specified file and format. For a list of formats, see [Signal Viewer](markdown/SI_signal_viewer.md).

See also

[Opening a Signal](markdown/SI_create_open_signal.md)

[Signal Viewer](markdown/SI_signal_viewer.md)


---

## Creating an Icon

_Source: `markdown/SI_Creating_Icon.md`_

# Creating an Icon

To create a new icon, proceed as follows:

1. In the Component Manager, select the folder where you want to add the new icon.
1. Do one of the following:
1. [Start the icon editor](markdown/SI_start_icon_editor.md).
1. [Load a bitmap](markdown/SI_load_icon.md).
1. [Scale the icon](markdown/SI_scale_icon.md).

See also

[Starting the Icon Editor](markdown/SI_start_icon_editor.md)

[Loading a Bitmap](markdown/SI_load_icon.md)

[Scaling an Icon](markdown/SI_scale_icon.md)

[Saving an Icon to a File](markdown/SI_save_icon.md)


---

## Starting the Icon Editor

_Source: `markdown/SI_start_icon_editor.md`_

# Starting the Icon Editor

To start the icon editor, proceed as follows:

1. Select an existing icon from the database or workspace.
1. Do one of the following:

- Double-click on the selected icon.
- In the Edit menu, select Open Component.
- Press Return.
- In the context menu, select Open Component.

The icon editor window opens.

If you have created a new icon, the icon pane is empty. If you have opened an existing icon, it is displayed in the icon pane.

See also

[Creating an Icon](markdown/SI_Creating_Icon.md)

[Loading a Bitmap](markdown/SI_load_icon.md)

[Scaling an Icon](markdown/SI_scale_icon.md)

[Saving an Icon to a File](markdown/SI_save_icon.md)


---

## Loading an Image

_Source: `markdown/SI_load_icon.md`_

# Loading an Image

You can load an image file with BMP, JPG or TIFF format and use it as an icon in ASCET. Thus, you can either design your own icons with a drawing program, or use existing ones. You should make sure that the images you are importing are of an appropriate size, i.e. no larger than the graphical block the icon is to be assigned to. One grid unit in ASCET corresponds to 10 pixels.

Progressive JPEG images cannot be used for ASCET icons. You must convert such a file to normal JPEG before you can import it.

To load an image into an icon, proceed as follows:

1. Open the icon in the icon editor.
1. In the icon editor, open the Icon menu and select Load.
1. Select the name of the image file you want to load.
1. Click Open.

The selected image is displayed in the icon editor.

See also

[Creating an Icon](markdown/SI_Creating_Icon.md)

[Scaling an Icon](markdown/SI_scale_icon.md)

[Saving an Icon to a File](markdown/SI_save_icon.md)


---

## Scaling an Icon

_Source: `markdown/SI_scale_icon.md`_

# Scaling an Icon

Icons can be scaled up or down to make them fit the block in which they are to be used. Scaling will, however, result in a degradation of image quality. Scaling by large factors should therefore be avoided.

To scale an icon, proceed as follows:

1. Open the icon editor for the icon you want to scale.
1. Adjust the vertical and horizontal size of the icon with the two Size boxes underneath the icon pane.
1. Click OK.

See also

[Creating an Icon](markdown/SI_Creating_Icon.md)

[Loading a Bitmap](markdown/SI_load_icon.md)

[Saving an Icon to a File](markdown/SI_save_icon.md)

[Starting the Icon Editor](markdown/SI_start_icon_editor.md)


---

## Saving an Icon to a File

_Source: `markdown/SI_save_icon.md`_

# Saving an Icon to a File

It is possible to save ASCET icons as bitmap files. This is useful, for instance, if you want to illustrate the documentation of your components.

To save an icon to a file, proceed as follows:

1. Open the icon editor for the icon you want to store to a file.
1. In the Icon menu, point to File Out and select <file format>.
1. Select the filename and the path where you want to save the icon.
1. Click Open.

The icon is stored in the selected format (BMP, JPG or TIF).

See also

[Loading a Bitmap](markdown/SI_load_icon.md)

[Creating an Icon](markdown/SI_Creating_Icon.md)

[Scaling an Icon](markdown/SI_scale_icon.md)


---

## Signal Viewer

_Source: `markdown/SI_View_Signal_Item_Window.md`_

# View Signal Item Window

The View Signal Item window (i.e. the signal viewer) contains the following elements:

- [File](markdown/SI_File_Menu.md) Menu
- [Navigation](markdown/SI_Navigation_Menu.md) Menu
- [Toolbar](markdown/SI_Toolbar.md)
- display table

Here, the signal is displayed as a table. The first column contains the data labels, the first row contains timing information. The table can show up to 1000 data columns at a time; the number can be adjusted in the ASCET options, Signal Editor node. If the signal contains more data, use the Navigation menu or the toolbar to display them.

See also

[Component Manager - Setting ASCET Options](ComponentManagerEnglishUS.chm::/SettingASCET.htm)


---

## File Menu

_Source: `markdown/SI_File_Menu.md`_

# File Menu

This menu contains the following options:

Store Imported Data In

Sets an internal storage format for imported measurement data. The possible formats are available in a submenu.

| Column 1 |
| --- |
| ASCII Format |
| FAMOS Channel Format |
| FAMOS Record Format |
| Matlab Source Code Format |
| MDF Format |

A default storage format is set in the ASCET options, Signal Editor node. When you select the MDF (V2.00) or FAMOS format, you can select and view different time frames.

Import

Imports measurement data to the signal.

Export

Exports the signal data to a file. The possible formats of the signal are available in a submenu.

| Column 1 |
| --- |
| ASCII Format |
| ASCII Format |
| MDF Format |
| Matlab Source Code Format |

Exit (Alt + F4)

Closes the signal viewer.

See also

[Importing Measurement Data to a Signal](markdown/SI_import_measurement_data.md)

[Exporting a Signal](markdown/SI_Exporting_Signal.md)

[Component Manager - Setting ASCET Options](ComponentManagerEnglishUS.chm::/SettingASCET.htm)


---

## Navigation Menu

_Source: `markdown/SI_Navigation_Menu.md`_

# Navigation Menu

This menu contains the following options:

First Sample

Displays the first <n> data columns.

<n> is set in the ASCET options, Signal Editor node.

Last Sample

Displays the last <n> data columns.

Previous Sample

Shifts the displayed data columns one position to the left. If, e.g., the table showed columns 8 to 17, columns 7 to 16 are shown afterwards.

Next Sample

Shifts the displayed data columns one position to the right. If, e.g., the table showed columns 8 to 17, columns 9 to 18 are shown afterwards.

Previous Sample Set (Ctrl + f)

Displays the previous <n> data columns. If, e.g., the table showed columns 18 to 27, columns 8 to 17 are shown afterwards.

Next Sample Set (Ctrl + ¦)

Displays the next <n> data columns. If, e.g., the table showed columns 1 to 10, columns 11 to 20 are shown afterwards.

See also

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)

[Component Manager - Setting ASCET Options](ComponentManagerEnglishUS.chm::/SettingASCET.htm)


---

## Toolbar

_Source: `markdown/SI_Toolbar.md`_

# Toolbar

The toolbar contains the following elements:

| Column 1 | Column 2 |
| --- | --- |
|  | Displays the first <n> data columns. <n> is set in the ASCET options, Signal Editor node. |
|  | Displays the previous <n> data columns. If, e.g., the table showed columns 18 to 27, columns 8 to 17 are shown afterwards. |
|  | Shifts the displayed data columns one position to the left. If, e.g., the table showed columns 8 to 17, columns 7 to 16 are shown afterwards. |
|  | Shifts the displayed data columns one position to the right. If, e.g., the table showed columns 8 to 17, columns 9 to 18 are shown afterwards. |
|  | Displays the next <n> data columns. If, e.g., the table showed columns 1 to 10, columns 11 to 20 are shown afterwards. |
|  | Displays the last <n> data columns. |

Time raster combo box

Used to select a time frame. Only available when MDF or FAMOS format was used for the import.

See also

[Viewing Measurement Data](markdown/SI_view_measurment_data.md)

[Component Manager - Setting ASCET Options](ComponentManagerEnglishUS.chm::/SettingASCET.htm)


---

