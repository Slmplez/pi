# The Calibration System

The calibration system is the same for online and offline experiments. The Calibration Window combo box lists all currently open calibration windows and offers the option of opening a new one. It is possible to have several elements in the same window, but only if they are of the same type, i.e. several tables can be in a table editor, several scalar elements can be in a numerical editor, etc. Assigning elements to calibration windows works like assigning elements to measurement windows.

You can use the calibration system to modify the values of the basic elements of the components you are experimenting with. You can alter the values when you set up the experiment, or while it is executing. However, modified values take priority over default settings in the calibration system.

If you assign a value to an element with the calibration system, this value remains until it is edited again, changed by a calculation within the component or overwritten by a value from the data generator. The data editors are the same as the ones used to specify components.

When specifying a component, you can assign an initial value to each element in your specification. All of these values—except constants—can be changed at a later stage. You can specify different data sets, i.e. sets of initialization values between which you can toggle, or you can change individual values during experimentation. [Editing Data](DataEditorEnglishUS.chm::/DEd_Overview.htm) describes the different editors for the various kinds of elements.

Usually a data editor is first called from within the component development environment, e.g. the block diagram editor, to assign a default value to an element. Then the editor can be opened again from within the experimentation environment, to calibrate the value of the element in the course of an experiment. Data editors can also be used to define data sets for components or projects. Data editors always work the same, regardless of which part of ASCET they were opened from.

How to open data editors from within the offline experimentation environment is described in [Calibrating an Element](calibrating_element.md).

See also

[Data Editors for Calibration Variables](data_editors_calibration_variables.md)

[Working with Calibration Windows](working_calibration_window.md)

[Calibrating an Element](calibrating_element.md)

[Editing Data - Overview](DataEditorEnglishUS.chm::/DEd_Overview.htm)
