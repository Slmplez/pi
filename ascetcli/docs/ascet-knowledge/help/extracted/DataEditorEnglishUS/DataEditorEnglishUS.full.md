# Merged CHM Content

## Overview

_Source: `markdown/DEd_Overview.md`_

# Overview

When specifying a component, you can assign an initial value to each element in your specification. All of these values can be changed at a later stage. You can specify different data sets, i.e. sets of initialization values between which you can toggle, or you can change individual values during experimentation. This section describes the different editors for the various kinds of elements.

Usually a data editor is first called from within the component development environment, e.g. the block diagram editor, to assign a default value to an element. Then the editor can be opened again from within the experimentation environment to calibrate the value of the element during an experiment ([Setting up a Numerical Editor](ExperimentationEnglishUS.chm::/setup_numerical_editor.htm)). Data editors can also be used to define data sets for components or projects.

Data sets are independent from implementations ([Editing Implementations](ImplementationEditorEnglishUS.chm::/IEd_Overview.htm)). Nevertheless inconsistencies between both can arise. In the context of a project, the value of an element defined in its data set can exceed the value range defined in the implementation. It is the user’s responsibility to use consistent project settings.

At code generation time, the initialization values of basic elements must fit the value ranges defined by their implementations. Otherwise an error message is generated for parameters, a warning for variables.

See also

[Setting up a Numerical Editor](ExperimentationEnglishUS.chm::/setup_numerical_editor.htm)

[Editing Implementations - Overview](ImplementationEditorEnglishUS.chm::/IEd_Overview.htm)

[Editors for Scalar Types](markdown/DEd_editors_scalar_types.md)

[The Editor for Combined Types (Table Editor)](markdown/DEd_editor_combined_types.md)

[Data Sets](markdown/DEd_data_sets.md)

[Special Characteristic Table Types](markdown/DEd_specCharTables.md)


---

## Editors for Scalar Types

_Source: `markdown/DEd_editors_scalar_types.md`_

# Editors for Scalar Types

The types of Scalar Editor are:

- [Numerical Editor](markdown/DEd_numerical_editor.md)
- [Logical Editor](markdown/DEd_logical-editor.md)
- [Enumeration Editor](markdown/DEd_enumeration_editor.md)


---

## Table Editor (Editor for Combined Types)

_Source: `markdown/DEd_editor_combined_types.md`_

# The Table Editor (Editor for Combined Types)

Tables are ASCET data structures for describing characteristic lines and maps. The curves in a table are not defined by a mathematical function, but rather by defining individual data points that form the output of particular input values. The maximum number of data points is specified in the specification editor after the table element is selected. ASCET supports one- and two-dimensional tables.

The creation of a table is described in [Arrays, Matrices, Characteristic Curves and Maps](BlockDiagramEditorEnglishUS.chm::/BDE_ArraysMatrices.htm). You can edit the table element from the Outline tab of a component editor. The table editor (also multi editor) contains a menu bar, the v: combo box which contains the names of the currently edited tables, a data display field and varying setup fields for the table size. The currently interpolation mode of a characteristic line/map is displayed. The selection can be changed in the [properties editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm).

The data display field shows the sample points (array/matrix: index values) and output values which can be edited according to the type of the edited table. The editors briefly introduced in the following sections are the different forms of the table editor. A more detailed description is given in [Working with Calibration Windows](ExperimentationEnglishUS.chm::/working_calibration_window.htm).

While you can add sample points dynamically during specification and experiments, the actual number of sample points must not exceed the maximum number defined at the creation of the table. The maximum number of values can only be changed in the Properties editor of the table.

See also

[Arrays, Matrices, Characteristic Curves and Maps](BlockDiagramEditorEnglishUS.chm::/BDE_ArraysMatrices.htm)

[Properties Editor](ElementEditorEnglishUS.chm::/EEd_Overview.htm)

[Working with Calibration Windows](ExperimentationEnglishUS.chm::/working_calibration_window.htm)

[Table Editor (Data Editor for Combined Types)](markdown/DEd_DataEditor_CombinedTypes.md)

[Special Characteristic Table Types](markdown/DEd_specCharTables.md)


---

## Special Characteristic Table Types

_Source: `markdown/DEd_specCharTables.md`_

# Special Characteristic Table Types

ASCET knows the following special types of characteristic lines/maps:

- [fixed tables](#Fixed)
- [group tables](#Group)

## Fixed Tables

Fixed tables and distributions are described here: [Fixed Table](introductionenglishus.chm::/INT_fixed_table.htm)

Editing Fixed Tables:

The values of fixed tables can be edited in the [table editor](markdown/DEd_editor_combined_types.md). The sample points cannot be edited in the table editor directly; to change them, proceed as described in [Editing the Axis Points of a Fixed Characteristic Line/Map](markdown/DEd_setup_axis_points.md).

## Group Tables

Group tables and distributions are described here: [Group Table and Distribution](IntroductionEnglishUS.chm::/INT_group_table_and_distribution.htm)

Editing Group Tables:

Group tables can be edited in the [table editor](markdown/DEd_editor_combined_types.md). When creating a group table, you are prompted for a distribution. This distribution is then assigned to the table, i.e. all the sample points defined in the distribution are also defined for the group table. It is not possible to make any changes to the group table x axis in the table editor, however, it is possible to switch to another distribution from the specification editor by selecting Distribution from the Edit menu. Assigning values on the z-axis works in the same way as for normal tables.

Editing Distributions:

Distributions can be edited in the table editor. The main difference between a distribution and another table is that the sample point axis values are added to the z-axis on the table. The x-axis serves for navigation purposes only and cannot be changed. None of the commands for changing the x-axis are available for distributions in the table editor.

See also

[Table Editor (Editor for Combined Types)](markdown/DEd_editor_combined_types.md)

[Editing the Axis Points of a Fixed Characteristic Line/Map](markdown/DEd_setup_axis_points.md)

[Introduction - Group Table and Distribution](IntroductionEnglishUS.chm::/INT_group_table_and_distribution.htm)


---

## Data Sets

_Source: `markdown/DEd_data_sets.md`_

# Data Sets

Every component or project can have a number of data sets. Data sets determine the initial values of the elements, i.e. parameters and variables, and of the components. A data set contains one initialization value for each element of the component or project. Therefore, data sets define variants of components and projects.

Data sets are handled in the same way as for components and projects. Each component data set includes the initial values for all the basic elements used in that component. For complex elements, which have their own data sets, the component data set has a reference to one of the data sets of the complex element.

Each component can have several data sets. When a component is first created, a default data set with the name Data is created with it.

There is one major difference between components and projects, namely that projects have global elements as well as the components they reference. In contrast to the data for the components, where a project can have several data sets, there is only one data set for the global elements.

Once you have set the data exchange options for your system, you can use the data exchange tool set to import and export data sets. The tool set can be accessed through the corresponding menu choices in the data set editor.

See also

[Viewing Data Sets](markdown/DEd_view_data.md)

[Creating or Coping a New Data Set](markdown/DEd_create_copy_data.md)

[Deleting a Data Set](markdown/DEd_delete_data_set.md)

[Renaming a Data Set](markdown/DEd_rename_data_set.md)

[Making a Data Set the Default](markdown/DEd_make_dataset_default.md)

[Browsing a Data Set](markdown/DEd_browse_dataset.md)

[Exporting a Data Set](markdown/DEd_export_dataset.md)

[Showing the Differences Between Two Data Sets](markdown/DEd_show_difference_2datasets.md)

[Writing Array or Table Data to a File](markdown/DEd_write_array_tabledata.md)

[Reading the Data for an Array or a Table from a File](markdown/DEd_read_data_array_table.md)

[Working with the Global Elements Data Set](markdown/DEd_work_globalelement_dataset.md)

[Setting the Data Exchange Options](markdown/DEd_set_data_exchange_option.md)

[Using the Data Exchange Tool Set](markdown/DEd_use_data_exchange_toolset.md)


---

## Opening a Data Editor

_Source: `markdown/DEd_open_editor.md`_

# Opening a Data Editor

To open a data editor, proceed as follows:

1. In the Outline tab of the component editor, highlight the element you want to edit.
1. In the Edit menu, select Data.
1. In the Edit menu, point to Component and select Data.

Similar to opening the properties editor ([Opening the Properties Editor](ElementEditorEnglishUS.chm::/EEd_open_element_editor.htm)), further possibilities to open the data editor exist.

The data editor for the selected element or component opens.

See also

[Editing Dependent Parameters](markdown/DEd_Editing_Dependent_Parameters.md)

[Opening the Properties Editor](ElementEditorEnglishUS.chm::/EEd_open_element_editor.htm)

[Editors for Scalar Types](markdown/DEd_editors_scalar_types.md)

[The Editor for Combined Types (Table Editor)](markdown/DEd_editor_combined_types.md)


---

## Editing Scalar Types

_Source: `markdown/DEd_EditingScalarTypes.md`_

# Editing Scalar Types

- [Editing a Numerical Value](markdown/DEd_edit_value.md)
- [Editing a Logical Value](markdown/DEd_edit_logical_editor.md)
- [Selecting an Enumerator](markdown/DEd_select-enumerator.md)


---

## Editing a Numerical Value

_Source: `markdown/DEd_edit_value.md`_

# Editing a Numerical Value

To edit a value, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the numerical element.
1. Click on the numeric display and edit the value as required.
1. Click OK to import the modification.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Editing a Logical Value

_Source: `markdown/DEd_edit_logical_editor.md`_

# Editing a Logical Value

To edit a logical value, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the logical element.
1. Activate the option to set the value to true.
1. Deactivate the option to set the value to false.
1. Click on OK to import your modification.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Selecting an Enumerator

_Source: `markdown/DEd_select-enumerator.md`_

# Selecting an Enumerator or Mode

To select an enumerator or mode, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the enumeration or mode group.
1. Click on the combo box.
1. Select the enumerator/mode you want.
1. Click OK to confirm your changes.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Editing Combined Types

_Source: `markdown/DEd_EditingCombinedTypes.md`_

# Editing Combined Types

- [Setting up an Array](markdown/DEd_setup_array.md)
- [Editing a Characteristic Line](markdown/DEd_edit_1d_table.md)
- [Editing a Characteristic Map](markdown/DEd_EditCharacteristicMap.md)
- [Editing the Axis Points of a Fixed Characteristic Line/Map](markdown/DEd_setup_axis_points.md)


---

## Editing an Array or Matrix

_Source: `markdown/DEd_setup_array.md`_

# Editing an Array or Matrix

To set up an array, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the array.
1. Adjust the number of actual x-axis points in the x-Size field.
1. In the editor window, double-click on a cell in the Value line.
1. Type in a value and press Enter.
1. Repeat for all the other values.
1. Click OK to accept your settings.

For a matrix, the table editor shows the index and output values of both axes and contains four setup fields for the size. Otherwise, it is used in exactly the same way.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Editing a Characteristic Line

_Source: `markdown/DEd_edit_1d_table.md`_

# Editing a Characteristic Line

To edit a characteristic line or 1-D table, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the table.
1. Adjust the number of sample points in the x-Size box.
1. Adjust the sample points.
1. Modify the z-axis values as described in [Setting Up an Array](markdown/DEd_setup_array.md).
1. Click OK.

The interpolation mode is selected in the Properties editor of the characteristic line. It cannot be changed in the table editor.

The extrapolation mode is always set to Constant. For all x-values greater than the highest x-value defined in the table, the value returned is the z-value of the highest x-value. For values that fall below the lowest x-value, the z-value of the lowest x-value is returned.

The sample points are shown on the x-axis of the data area, the values are on the z-axis. By default the number of sample points that you entered in the Properties editor is created. The default sample points form a range between 0 and the number of sample points minus 1.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)

[Setting Up an Array or Matrix](markdown/DEd_setup_array.md)

[Properties Editor - Overview](ElementEditorEnglishUS.chm::/EEd_Overview.htm)


---

## Editing a Characteristic Map

_Source: `markdown/DEd_EditCharacteristicMap.md`_

# Editing a Characteristic Map

To edit a characteristic map or 2-D table, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) for the table.
1. Adjust the number of sample points in the x-Size and y-Size boxes.
1. Adjust the sample points.
1. Adjust the values.
1. Click OK.

The interpolation mode is selected in the Properties editor of the characteristic map. It cannot be changed in the table editor.

The extrapolation mode is always set to Constant. For all x- or y-values greater than the highest x-/y-value defined in the table, the value returned is the value of the highest x-/y-value. For values that fall below the lowest x- or y-value, the value of the lowest x-/y-value is returned.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)

[Properties Editor - Overview](ElementEditorEnglishUS.chm::/EEd_Overview.htm)


---

## Editing the Axis Points of a Fixed Characteristic Line/Map

_Source: `markdown/DEd_setup_axis_points.md`_

# Editing the Axis Points of a Fixed Characteristic Line/Map

To set up the axis points, proceed as follows:

1. Open the fixed characteristic line or map you want to edit in the table editor.
1. In the Axis menu of the table editor, select X Supporting Point Setup.
1. In the Offset field, enter the offset for the first axis point.
1. In the Distance field, enter the distance between the axis points.
1. Click OK.
1. Edit the Y axis points of a fixed characteristic map via the Axis menu, selecting Y Axis Support Points Setup.
1. Edit the values of the fixed characteristic [line](markdown/DEd_edit_1d_table.md) or [map](markdown/DEd_EditCharacteristicMap.md).

In a distribution, the Edit Distribution Points option in the Axis menu opens the Distribution Setup window. You can use the window as described above, but it changes the values of the distribution, not the index (x axis).

See also

[Editing a Characteristic Line](markdown/DEd_edit_1d_table.md)

[Editing a Characteristic Map](markdown/DEd_EditCharacteristicMap.md)

[Special Characteristic Table Types](markdown/DEd_specCharTables.md)


---

## Viewing Data Sets

_Source: `markdown/DEd_view_data.md`_

# Viewing Data Sets

To view data sets, proceed as follows:

1. In the specification editor, open the Edit menu, point to Component and select Data to view the data for the current project or component.

The Data Editor for: <Component> window opens.

The names of all the project data sets are displayed in the Data pane.

All components included in the project or component are displayed in the Elements pane, together with elements. With basic elements, the value is specified after the element name and type. With complex elements the name of the referencing dataset is displayed.

1. Select the data set you want to view in the Data pane.

The values for the data set selected are displayed in the Elements pane.

1. Click OK.

The data set currently selected, for which the values are shown, becomes the active data set when you close the data editor. You can also open the dataset editor from the browser by selecting a referenced component in the Data tab.


---

## Editing Data Sets

_Source: `markdown/DEd_EditDataSets.md`_

# Editing Data Sets

Editing the data sets of a component or project contains the following steps.

1. [Opening the Data Editor](markdown/DEd_open_editor.md) of the component/project
1. [Creating or Copying a New Data Set](markdown/DEd_create_copy_data.md)
1. [Selecting a Default Data Set](markdown/DEd_make_dataset_default.md)
1. [Editing Data in a Data Set (A)](markdown/DEd_open_data_editor.md)
1. [Editing Data in a Data Set (B)](markdown/DEd_copy_data.md)
1. [Renaming a Data Set](markdown/DEd_rename_data_set.md)
1. [Deleting a Data Set](markdown/DEd_delete_data_set.md)


---

## Creating or Copying a New Data Set

_Source: `markdown/DEd_create_copy_data.md`_

# Creating or Copying a New Data Set

To create/copy a new data set, proceed as follows:

1. Open the data editor for the component.
1. In the Data menu, select Add.

A new data set is created. All elements have a default value. This is either 0.0 or true for basic elements, or the corresponding default data set for complex elements

or

1. In the Data menu, point to Copy and select Flat.

The active data set is copied, i.e. the newly created data set contains the same values. If there are references to other data sets, they are copied as well

or

1. In the Data menu, point to Copy and select Recursive.

An input window opens.

1. Enter a prefix for the names of the copied datasets and click OK.

The active data set is copied, and recursive copies made of all the referenced data sets, i.e. the copies of those data sets are also recursive. The new data set has references to the copies of the referenced data sets.

This process only works for local variables.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Selecting a Data Set

_Source: `markdown/DEd_SelectDataSet.md`_

# Selecting a Data Set

To select a data set, proceed as follows:

1. [Open the data editor](markdown/DEd_open_editor.md) of the component/project.
1. In the Data pane, select the data set you want to edit.
1. Click OK to close the data editor.

The selection is valid until you select another data set, or until you close the component editor.

See also

[Data Sets](markdown/DEd_data_sets.md)

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Selecting a Default Data Set

_Source: `markdown/DEd_make_dataset_default.md`_

# Selecting a Default Data Set

To select a default data set, proceed as follows:

1. Open the Data for: <Component> dialog.
1. Select the data set you want to make the default.
1. In the Data menu, select Become Default.

The selected data set becomes the default; it is marked with the word [DEFAULT]. Whenever the component or project is opened, this data set will be active.

See also

[Opening a Data Editor](markdown/DEd_open_editor.md)


---

## Editing Data in a Data Set (A)

_Source: `markdown/DEd_open_data_editor.md`_

# Editing Data in a Data Set (A)

You have several possibilities to edit the data of individual elements.

To edit the data of individual elements via the data, proceed as follows:

1. In the Data for: <Component> dialog window, select the basic element you want to edit.
1. Do one of the following:

- In the Element menu, select Edit.
- Double-click the selected element.

The appropriate data editor opens, e.g. the table editor opens if the element is a characteristic line.

See also

[Editing Data in a Data Set (B)](markdown/DEd_copy_data.md)

[Browsing a Data Set of an Included Component](markdown/DEd_browse_dataset.md)


---

## Editing Data in a Data Set (B)

_Source: `markdown/DEd_copy_data.md`_

# Editing Data in a Data Set (B)

To copy data of individual elements, proceed as follows:

1. In the Data for: <Component> dialog window, select the basic element whose data you want to copy.
1. Do one of the following:
1. Select the basic element you want to copy the data to.
1. Do one of the following:

- In the Element menu, select Paste Data From Buffer
- In the context menu, select Paste Data From Buffer.

The data are copied from the database/workspace clipboard to the element.

See also

[Editing Data in a Data Set (A)](markdown/DEd_open_data_editor.md)


---

## Working with the Global Elements Data Set

_Source: `markdown/DEd_work_globalelement_dataset.md`_

# Working with the Global Elements Data Set

To work with the global elements data set, proceed as follows:

1. In the project editor, open the Edit menu, point to Component and select Data to open the data editor dialog window.
1. Click on the Global tab of the dialog to view the data for the global elements in the project.

Even if more than one data set is shown in the Data pane, you cannot select to edit them.


---

## Renaming a Data Set

_Source: `markdown/DEd_rename_data_set.md`_

# Renaming a Data Set

To rename a data set, proceed as follows:

1. In the Data for: <Component> window, select the data set you want to rename.
1. In the Data menu, select Rename.
1. Type in the new name and press Enter.

When a data set in the Data for: <Component> dialog box is selected, it becomes the active data set. If you close the component or project editor and then open it again, the default data set will however be active again. There is always one default data set associated with each component and project, initially it is the one that is created automatically when the component or project is created.


---

## Deleting a Data Set

_Source: `markdown/DEd_delete_data_set.md`_

# Deleting a Data Set

To delete a data set, proceed as follows:

1. In the Data for: <Component> window, select the data set you want to delete.
1. In the Data menu, select Delete.

The data set is deleted. If other data sets have referenced that data set, they now reference the data set that becomes active after deletion. The default data set cannot be deleted.


---

## Browsing a Data Set of an Included Component

_Source: `markdown/DEd_browse_dataset.md`_

# Browsing a Data Set of an Included Component

If a data set contains references to other data sets, it is possible to browse the data sets those references point to.

To browse a data set, proceed as follows:

1. In the Data for: <Component> dialog window, select the data set you want to browse.
1. Select the complex element (component) with the data set you want to browse.
1. Do one of the following:
1. Use this procedure recursively to browse through an entire data set hierarchy.


---

## Showing the Differences Between Two Data Sets

_Source: `markdown/DEd_show_difference_2datasets.md`_

# Showing the Differences Between Two Data Sets

To show the differences between two data sets, proceed as follows:

1. In the Data for: <Component> dialog window, select two of the of the component or project data sets in the Data pane.

You can select multiple data sets by clicking on them while holding down the Ctrl key.

1. In the Data menu, point to Show Differences and select Flat.

The data sets are compared on the first level, i.e. only the values for the basic elements contained in the project or component are compared. Referenced data sets are not taken into account. The Differences dialog box opens showing the differences in the data sets. The differences for scalar elements are shown directly, non-scalar elements with different data are only listed.

or

1. In the Data menu, point to Show Differences and select Recursive.

The data sets are compared recursively, i.e. independent of the data sets referenced, the values of the basic elements in all referenced components are compared.

1. In the Differences window, select Copy To Clipboard to copy the results of the comparison to the clipboard.

They can now be pasted into another application.


---

## Exporting a Data Set

_Source: `markdown/DEd_export_dataset.md`_

# Exporting a Data Set

The data set of a project or a component can be exported separately from the functional specifications. With this feature the data sets and the specification can be developed in parallel.

To export a data set, proceed as follows:

1. In the Data for: <Component> dialog, select the data set you want to export.
1. In the Data menu, select Export.

The Windows file selection dialog box opens.

1. Type in a data set name and press Enter.

The data set selected is exported.

The same commands are also available in the main menus of the specification editors (File menu, Export submenu, Data submenu, For Component menu option) and the project editors.


---

## Writing Array or Table Data to a File

_Source: `markdown/DEd_write_array_tabledata.md`_

1. In the Elements pane of the Data for: <Component> dialog window, select a table or array.
1. In the Element menu, select File Out Data.

The Windows file selection dialog box opens.

1. Select a path and a filename.
1. Click on Save.

The data from the table or array selected is written to the file.

1. In the Outline tab of the specification editor, select a table or array.
1. In the File menu, point to Export, then point to Data and select For Selected Element.

The Windows file selection dialog box opens.

1. Select a path and a filename.
1. Click on Save.

The data from the table or array selected is written to the file.

# Writing Array or Table Data to a File

It is possible to write the data from a table or an array to a file and to read it in again. The data is written in tab-delimited ASCII format.

To write array or table data to a file, proceed as follows:

##### [From the Data for: <Component> dialog window](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

[From the specification editor](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="markdown/images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="markdown/images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="markdown/images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](markdown/+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }


---

## Reading the Data for an Array or a Table from a File

_Source: `markdown/DEd_read_data_array_table.md`_

1. In the Elements pane of the Data for: <Component> dialog window, select a table or array.
1. In the Element menu, select File In Data.

The Windows file selection dialog box opens.

1. Select the file that contains the data you want to read.
1. Click on Open.

1. In the Outline tab of the specification editor, select a table or array.
1. In the File menu, point to Import, then point to Data and select For Selected Element.

The Windows file selection dialog box opens.

1. Select the file that contains the data you want to read.
1. Click on Open.

# Reading the Data for an Array or a Table from a File

To read the data for an array or a table from a file, proceed as follows:

##### [From the Data for: <Component> dialog window](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

[From the specification editor](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

If the file format does not match the selected element, the data set is left unchanged and a message box appears. This happens, for instance, if the sample points are not given in monotonous rising order. If the file contains missing numbers, these are treated as zeroes (for instance if the number of sample values does not match the number of sample points). If the file contains invalid characters, these are interpreted as zero. The size of the element is adjusted to the data that is read in.

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="markdown/images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="markdown/images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="markdown/images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](markdown/+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }


---

## Setting the Data Exchange Options

_Source: `markdown/DEd_set_data_exchange_option.md`_

# Setting the Data Exchange Options

An additional tool set for data exchange is available in ASCET. Users can perform flat and recursive file in and file out operations for the parameters in data sets using various filter and data exchange options and file formats.

To set the data exchange options, proceed as follows:

1. In the Component Manager, open the ASCET options window.
1. In the Data Exchange tab, adjust the desired options.

See also

[Data Exchange Options](ComponentManagerEnglishUS.chm::/CM_Data_Exchange_Node.htm)


---

## Using the Data Exchange Tool Set

_Source: `markdown/DEd_use_data_exchange_toolset.md`_

# Using the Data Exchange Tool Set

To use the data exchange tool set, proceed as follows:

1. In the Data for: <Component> dialog window, select the data set you want to edit.
1. In the Data menu, select File Out Recursive to file out the selected data set and all referenced data sets.
1. In the Data menu, select File Out to file out the selected data set.
1. In the Data menu, select File In Recursive, to file in a data set with all referenced data sets.
1. In the Data menu, select File In to file in a data set.
1. In the Data menu, select Show Data File to view a data file.
1. In the Data menu, select Show File In Log File to view the log file for read processes.
1. In the Data menu, select Show File Out Log File to view the log file for write processes.


---

## Editing Dependent Parameters

_Source: `markdown/DEd_Editing_Dependent_Parameters.md`_

- In the Edit menu, select Data.

Or

- Right-click on the element in the Outline tab or the drawing area, and select Data from the context menu.

Or

- In the Browser view, select the Data tab.
- Highlight the element you want to edit.
- Press Enter or right-click on the Data tab and select Edit from the context menu.

# Editing Dependent Parameters

In order to make the dependency of the element in the model effective, the formal parameters must be specified according to the model.

To specify the formal parameters, proceed as follows:

1. In the Outline tab of the specification editor, select the dependent parameter you want to edit.
1. [Open the data editor for the dependent parameter](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.
1. For each formal parameter in the Identifier column, select a parameter, constant or system constant from the combo box in the Model Parameter column.
1. Close the Edit Dependency for: window with OK.

With that, a model parameter, constant or system constant which determines the dependent parameter value is assigned to the formal parameter.

If you assigned a constant or system constant, the placeholder is replaced by the actual value in the generated code.

See also

[Edit Dependency for: Window](markdown/DEd_Edit_Dependency_for__Window.md)

[Creating the Formula for Dependent Parameters](ElementEditorEnglishUS.chm::/EEd_create_fromula_dependent.htm)

[Editing the Formula of a Dependent Parameter](ElementEditorEnglishUS.chm::/EEd_edit_formula_dependent.htm)

[Introduction - Dependent Parameters](IntroductionEnglishUS.chm::/INT_dependent_parameters.htm)

[Introduction - Importing Dependent Parameters](IntroductionEnglishUS.chm::/INT_Importing_Dependent_Parameters.htm)

[Introduction - Constants and System Constants](IntroductionEnglishUS.chm::/INT_constants_and_system_constants.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="markdown/images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="markdown/images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="markdown/images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](markdown/+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }


---

## Mapping a Reference

_Source: `markdown/DEd_MappingReference.md`_

# Mapping a Reference

Unless specified otherwise (see [Initialization of Explicit References](introductionenglishus.chm::/INT_InitExplicitReferences.htm)), explicit references must be mapped to non-reference elements to grant initialization of the reference.

Explicit references must not be mapped to arrays, matrices or records used as messages. If they are, an error (MMdl3024) is issued during code generation: Cannot use the address of a message object <name>.

Proceed as follows:

1. [Open the data editor](markdown/DEd_view_data.md) for the component that contains the reference.
1. In the data editor for the component. select the desired data set.
1. In the Locals or Globals tab, select the reference.
1. [Open the data editor for the reference.](markdown/DEd_open_data_editor.md)
1. In the data editor for explicit references, select a non-reference element from the Value combo box.
1. Click OK to close the data editor for the reference.

In the data editor of the component, the name of the mapped element appears in the Data column of the reference.

The mapping is stored with the currently selected data set of the component. If you change the data set, you must map the reference again.

As an alternative, you can open the data editor for the reference directly from the component editor, via the Data option in the Edit menu or the context menu. If you do so, the mapping belongs to the currently selected data set.

See also

[Initialization of Explicit References](introductionenglishus.chm::/INT_InitExplicitReferences.htm)

[Explicit References](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Viewing Data Sets](markdown/DEd_view_data.md)

[Editing Data in a Data Set (A)](markdown/DEd_open_data_editor.md)


---

## Numerical Editor

_Source: `markdown/DEd_numerical_editor.md`_

# Numerical Editor

The numeric editor contains the following components:

- <variable name> field

The field is named as the edited variable. Here, you enter the value.

![](markdown/BUTTON.GIF) OK

Closes the numeric editor and accepts the changes.

![](markdown/BUTTON.GIF) Cancel

Closes the numeric editor without accepting the changes.

See also

[Editing a Numerical Value](markdown/DEd_edit_value.md)


---

## Logical Editor

_Source: `markdown/DEd_logical-editor.md`_

# Logical Editor

The logical editor contains the following components:

- <variable name> option

The option is named as the edited variable. The activated option sets the value to true, the deactivated option sets the value to false.

![](markdown/BUTTON.GIF) OK

Closes the logical editor and accepts the changes.

![](markdown/BUTTON.GIF) Cancel

Closes the logical editor without accepting the changes.

See also

[Editing a Logical Value](markdown/DEd_edit_logical_editor.md)


---

## Enumeration Editor

_Source: `markdown/DEd_enumeration_editor.md`_

# Enumeration Editor

The enumeration editor opens when you edit the data of an enumeration or mode group included in a component.

The enumeration editor contains the following components:

- <variable name> combo box

The combo box is named as the edited enumeration or mode group. It contains all enumerators/modes.

![](markdown/BUTTON.GIF) OK

Closes the enumeration editor and accepts the changes.

![](markdown/BUTTON.GIF) Cancel

Closes the enumeration editor without accepting the changes.

See also

[Selecting an Enumerator or Mode](markdown/DEd_select-enumerator.md)


---

## Description of the Table Editor (Data Editor for Combined Types)

_Source: `markdown/DEd_DataEditor_CombinedTypes.md`_

# Description of the Table Editor (Data Editor for Combined Types)

- The Table Editor is a single editor that can be used for the various combined types, i.e. for arrays, matrices, characteristic lines/maps and distributions. It contains the following elements:

- [Edit](markdown/DEd_EditMenuTableEditor.md) menu
- [Axis](markdown/DEd_AxisMenuTableEditor.md) menu
- [View](markdown/DEd_ViewMenuTableEditor.md) menu
- [Extras](markdown/DEd_ExtrasMenuTableEditor.md) menu
- combo box containing the name(s) of the edited table(s)
- the table field

The content of this field depends on the kind of table you edit.

| Column 1 | Column 2 |
| --- | --- |
| array | The first line in the table contains the index values. These values are fixed; they always start at 0 and are always incremented by one. The second line contains the array values. |
| matrix | The first line in the table contains the x index values. The first row in the table contains the y index points. These values are fixed; they always start at 0 and are always incremented by one. The remaining cells contain the matrix values. |
| characteristic line | The first line in the table contains the x-axis sample points. The values can be edited. The second line contains the values. |
| characteristic map | The first line in the table contains the x-axis sample points. The first row in the table contains the y-axis sample points. The values can be edited. The remaining cells contain the values. |
| distribution | The first line in the table contains index values. These values are fixed. The second line contains the values, i.e. the sample points of the group characteristic table that uses the distribution. |

- x-Max Size field

Determines the maximal size of the x-axis.

- X-Size field

Determines the actual size of the x-axis.

- y-Max Size and Y-Size fields

Only available for a matrix or characteristic map.

Determine maximal and actual size of the y-axis.

- Interpol. combo box

Only available for a characteristic line or map.

Shows the currently selected interpolation routine. By default, this is either Linear or Rounded, but you can add your own interpolation routines (see [User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)).

- Extrapol. combo box

Only available for a characteristic line or map.

Contains all available extrapolation routines.

![](markdown/BUTTON.GIF) OK

Closes the editor and accepts the changes.

![](markdown/BUTTON.GIF) Cancel

Closes the editor without accepting the changes.

See also

[Setting up an Array](markdown/DEd_setup_array.md)

[Editing a Characteristic Line](markdown/DEd_edit_1d_table.md)

[Editing the Axis Points of a Fixed Characteristic Line/Map](markdown/DEd_setup_axis_points.md)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)


---

## Edit Menu (Table Editor)

_Source: `markdown/DEd_EditMenuTableEditor.md`_

# Edit Menu (Table Editor)

This menu contains the following options:

Undo last change (Ctrl + u)

Reverses the most recent action.

Redo last change (Ctrl + d)

Reverses an undo command.

Copy (Ctrl + c)

Copies selected values to the clipboard.

Paste (Ctrl + v)

Pastes values from the clipboard to the table.

Copy Entire Data Into Clipboard

Copies all table data (sample points and values) to the clipboard.

Select All Values (Ctrl + a)

Selects all table values.

Decrement (Ctrl + n)

Decrements selected values by a defined step.

Increment (Ctrl + m)

Decrements selected values by a defined step.

Add Offset

Adds a defined offset to selected values.

Multiply By Factor

Multiplies selected values by a defined factor.

Fill with Values

Fills selected values by a defined factor.

File In Data

Reads data of a table or array from a file.

File Out Data

Writes data of a table or array to a file.


---

## Axis Menu (Table Editor)

_Source: `markdown/DEd_AxisMenuTableEditor.md`_

# Axis Menu (Table Editor)

This menu is only available for characteristic lines/maps and distributions.

For characteristic lines/maps, the menu contains the following options:

X Supporting Points Setup

Opens the setup window for the x axis of a fixed characteristic line/map.

Decrement X Axis Point (Ctrl + j)

Decrements selected x axis points by a defined step.

Increment X Axis Point (Ctrl + k)

Increments selected x axis points by a defined step.

Edit X Axis Point (Ctrl + x)

Opens an editor for the selected x axis point.

Add X Axis Point

Adds another sample point to the x axis.

Remove X Axis Point

Deletes the selected x axis point and the associated value(s) from the characteristic line/map.

Y Supporting Points Setup

Opens the setup window for the y axis of a fixed characteristic map.

Decrement Y Axis Point (Ctrl + r)

Decrements selected y axis points by a defined step.

Increment Y Axis Point (Ctrl + t)

Increments selected y axis points by a defined step.

Edit Y Axis Point (Ctrl + y)

Opens an editor for the selected y axis point.

Add Y Axis Point

Adds another sample point to the y axis.

Remove Y Axis Point

Deletes the selected y axis point and the associated value(s) from the characteristic map.

For a distribution, the menu contains the following options:

Edit Distribution Points

Opens the setup window for the values of a distribution.


---

## View Menu (Table Editor)

_Source: `markdown/DEd_ViewMenuTableEditor.md`_

# View Menu (Table Editor)

This menu contains the following options:

Reset Change Marks

Removes the markers for changed values.

Show Key Help

Keyboard commands are shown at the bottom of the table editor window.


---

## Extras Menu (Table Editor)

_Source: `markdown/DEd_ExtrasMenuTableEditor.md`_

# Extras Menu (Table Editor)

This menu contains the following options:

Change Title

Changes the name of the table editor window.

Optimize Size

Optimizes the size of the dialog window.

Display Setup (Ctrl + s)

Displays the setup window for the table editor (see also [Experiment Environment - Setting up the Table Editor](ExperimentationEnglishUS.chm::/setup_table_editor.htm)).

Physical Representation (Ctrl + p)

The table values are displayed as physical values.

Hexadec. Representation (Ctrl + h)

The table values are displayed in hexadecimal format.

About Variable (Ctrl + i)

Opens a window containing information on the edited array, matrix, distribution or characteristic line/map (see also [Experiment Environment - Displaying Information about Variables](experimentationenglishus.chm::/EE_display_informatiion_variables.htm)).


---

## Data Editor for Included Components

_Source: `markdown/DEd_Data_for___Component__Window.md`_

# Data for: <Component> Window

This window contains the following elements.

- [Data](markdown/DEd_Data_Menu.md) Menu
- [Element](markdown/DEd_Element_Menu.md) Menu
- Data field

Lists all available data sets. The data set that was selected when the editor was opened is marked with a ![](markdown/icon_defImpl.gif). The default data set is marked with the word [DEFAULT].

- Local Tab

Lists the local elements in the Elements table. The table contains the following columns:

| Column 1 | Column 2 |
| --- | --- |
| Element | Name of the element. |
| Type | Type of the element or name of the included component. |
| Data | Value of the basic element or name of the dataset of the included component. For explicit references, this column shows the name of the referenced item, the name in brackets if the referenced item is no longer available, or Undefined if no referenced item is assigned. |

- Global Tab

This tab is not available for records and SenderReceiver/NVData interfaces.

Lists the global elements in the Elements table. The columns are the same as in the Local tab.

![](markdown/BUTTON.GIF) OK

Closes the editor and accepts the changes.


---

## Data Menu

_Source: `markdown/DEd_Data_Menu.md`_

# Data Menu

This menu is also available as context menu in the Data field. It contains the following options:

##### Add

Creates a new data set for the component.

##### Rename

Renames the selected data set.

##### Delete

Deletes the selected data set.

##### Copy

Copies the active data set to a new data set.

| Column 1 | Column 2 |
| --- | --- |
| Flat | References to other data sets are copied to the new data sets. |
| Recursive | Copies are made of all referenced data sets, too. |

##### Show References

Shows references to the selected data set.

##### Become Default

Makes the selected data set the default data set.

##### Export

Exports the data set to an ASCET export file (*.exp).

##### Notes

Opens the notes editor for the selected data set. There, you can add comments to the data set.

##### Show Differences

Shows the differences between two selected data sets.

| Column 1 | Column 2 |
| --- | --- |
| Flat | Compares data sets on first level, i.e. only the values for the basic elements of the component itself. Referenced data sets are not taken into account. |
| Recursive | Compares the values of the basic elements of the component itself and of all included components. |

##### File Out Recursive

Writes the data of the selected data set and all referenced data sets to a file.

##### File Out

Writes the data of the selected data set to a file.

##### File In Recursive

Reads the data for the selected data set and all referenced data sets from a file.

##### File In

Reads the data for the selected data set from a file.

##### Show Data File

Views a data file.

##### Show File In Log File

Shows the log file for the read process.

##### Show File Out Log File

Shows the log file for the write process.


---

## Element Menu

_Source: `markdown/DEd_Element_Menu.md`_

# Element Menu

This menu is also available as context menu in the tabs. It contains the following options:

##### Edit

Opens the data editor for the selected element.

##### Copy Data To Buffer

Copies the data of the selected element to the database/workspace clipboard.

##### Paste Data From Buffer

Copies data from the database/workspace clipboard to the selected element.

##### File Out Data

Writes data of a table or array to a file.

##### File In Data

Reads data of a table or array from a file.


---

## Data Editor for Explicit References

_Source: `markdown/Ded_DataEditor_ExplicitReferences.md`_

# Data Editor for Explicit References

This window is used to map a complex element specified as explicit reference to an existing element that is not a reference. It contains the following elements:

- Element field

Displays the name of the reference element.

- Type field

Displays the type of the reference element, i.e. array, matrix, Class_Block_Diagram, etc.

- Value combo box

Select the existing element to map the reference element to. Possible values are Undefined and the names of all existing elements of identical type (and size in case of array/matrix) as the reference element.

![](markdown/BUTTON.GIF) OK

Closes the editor and accepts the changes.

![](markdown/BUTTON.GIF) Cancel

Closes the editor without accepting the changes.


---

## Edit Dependency for: Window

_Source: `markdown/DEd_Edit_Dependency_for__Window.md`_

# Edit Dependency for: Window

The Edit Dependency for: window is used to edit data of dependent parameters. It contains the following elements:

- Mapping Table

Maps formal parameters to model parameters.

| Column 1 | Column 2 |
| --- | --- |
| Identifier | This column lists all formal parameters used in the formula of the dependent parameter. |
| Model Parameter | Each cell of this column contains a combo box offering all available model parameters, constants and system constants, plus the [undefined] entry. |

- Formula

Lists the formula of the dependent parameter.

- context menu Copy Copies text from the Formula field into the clipboard. Select All Selects the entire content of the Formula field. Find/Replace Finds/replaces text in the Formula field.

![](markdown/BUTTON.GIF) OK

Closes the Edit Dependency for: window and accepts the settings.

![](markdown/BUTTON.GIF) Cancel

Closes the Edit Dependency for: window without accepting the settings.

See also

[Creating the Formula for Dependent Parameters](ElementEditorEnglishUS.chm::/EEd_create_fromula_dependent.htm)

[Editing Dependent Parameters](markdown/DEd_Editing_Dependent_Parameters.md)


---

