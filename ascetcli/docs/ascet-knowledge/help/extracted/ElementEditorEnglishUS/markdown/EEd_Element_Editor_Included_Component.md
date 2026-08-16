# Properties Editor for Included Components

This window contains the following editable elements.

##### Area General

- Name field

This field contains the element name.

- Comment field

In this field, you can enter a comment for the element.

- Kind combo box

Except for records and classes/modules in SWC, the value of Kind cannot be edited.

##### Area Basic Type

- Model Type combo box

This combo box lists the element type. Included components are of type Complex.

- Component combo box

This combo box contains the element name of the inserted component, together with the database/workspace path.

##### Area Scope

These options are not available for components included in AUTOSAR software components.

This field contains following three options for the element scope:

- Local
- Imported
- Exported

Select this option if the element shall be used in other projects/components.

One of these options is selected at a time. See also [Editing the Element Scope](EEd_EditElementScope.md).

- buttons

The buttons are only available for an element with scope Imported. See also [Imported Elements](EEd_ImportedElements.md).

- ![](buttonGoToExport.gif) Go to Export

Opens the properties editor for the corresponding exported element.

- ![](buttonSynchrWithExport.gif) Synchronize with Export

Sets the available properties to the values of the corresponding exported element.

The buttons are not available in the following cases:

- The imported element has no matching exported element in the current project context.
- The properties editor was opened for several imported elements at the same time.
- The component that provides the exported element is read-protected.

##### Area Attributes

- For included components with scope Imported in a defined project context, the area is named Attributes (derived from export).
- Reference option

This option is only available for records of the kind Variable and classes.

This option is to be set if the included component is a reference of another element.

- Virtual option

This option is only available for records that are no references. It is not available for records included in SWC.

This option specifies if the included component is virtual.

- Non-volatile option

This option is only available for records of the kind Variable that are no references. It is not available for records included in an SWC. Non-volatile and Virtual cannot be activated simultaneously.

If activated, this option places the included component in the non-volatile memory area of the target.

##### Area External Access

These options are not available for AUTOSAR software components.

- Set() Method option
- Get() Method option

Adds a Get port for the selected element. An output for the element is added to the component.

##### Area Internal Access

For the Internal Access, the behavior depends on component type and reference option:

- The component is not an AUTOSAR interface and the option Reference is not set.

In this case, the Internal Access field contains the options Write and Read, which are both activated. Editing is disabled.

- The component is a class or record specified as [explicit reference](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm).

In this case, following options for Internal Access are available:

- Write for Referenced Element option

- Read for Referenced Element option

If this option is active, the internal access to the referenced included component is set to Read.

It is not possible to disable both options at the same time.

- The component is a SenderReceiver, NVData or ClientServer interface

In this case following options for Internal Access are available:

- Provided option
- Required option

It is not possible to disable both options at the same time.

- The component is a Calibration interface

In this case, Internal Access is set to Required, and editing is disabled.

##### Area Calibration Access

This area is only available for records, except for records included in SWC.

The options determine the access to an element. See also [Editing Calibration Access](EEd_EditCalibrationAccess.md).

- Write option

Only editable for parameters.

Write access to the element. If Write is activated, Read is activated, too.

- Read option

Read access to the element.

Always Show Editor for new Elements option

This option determines whether the element editor opens automatically if a new component is inserted.

![](BUTTON.GIF) OK

Closes the properties editor and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the properties editor and discards the settings.

You can

[Edit the element scope](EEd_EditElementScope.md)

[Edit the calibration access](EEd_EditCalibrationAccess.md)

[Specify a reference](EEd_Specifying_a_Reference.md)

See also

[Imported Elements](EEd_ImportedElements.md)

[Explicit References](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm)

[Creating a Message](BlockDiagramEditorEnglishUS.chm::/BDE_CreateMessage.htm)
