# AUTOSAR Tab

The AUTOSAR tab is only available for elements in AUTOSAR components. It contains the following elements.

Policy combo box

The combo box is used to set the AUTOSAR <SW-IMPL-POLICY> element of the <DATA-DEF-PROPS>.

The following settings are available:

| Column 1 | Column 2 |
| --- | --- |
| element kind | possible selections |
| variable | STANDARD |
|  | MEASUREMENT POINT |
|  | QUEUED |
| parameter | STANDARD |
|  | CONST |
|  | FIXED |

See the ASCET AUTOSAR user's guide or the publications on the [AUTOSAR web site](http://www.autosar.org/) for more information on <SW-IMPL-POLICY> and <DATA-DEF-PROPS>.

Several restrictions apply:

- MEASUREMENT POINT and QUEUED are only available for variables in AUTOSAR SenderReceiver interfaces.
- If MEASUREMENT POINT is selected, the following applies:
- The variable must not be read. If the variable is read, an error (MMdl285) is issued during code generation.
- In the [properties editor](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm), the Write option in the Calibration Access area must be deactivated.

If it is activated, a warning (WMdl283) is issued and the option is deactivated.

- If QUEUED is selected, the following applies:

- The variable must be read explicitly. If it is read implicitly, an error (MMdl285) is issued.
- In the properties editor, both options in the Calibration Access area must be deactivated.

If at least one option is activated, a warning (WMdl283) is issued and the options are deactivated.

- CONST and FIXED are only available for elements in AUTOSAR Calibration interfaces.
- If CONST is selected, only the Read options in the Calibration Access area of the properties editor may be activated.

If Write is activated, an error (MMdl283) is issued.

- If FIXED is selected, both options in the Calibration Access area of the properties editor must be deactivated.

If at least one option is activated, a warning (WMdl283) is issued and the options are deactivated.

See also

[The Kind of Elements](IntroductionEnglishUS.chm::/INT_summaryke.htm)

[Properties Editor for Basic Elements](ElementEditorEnglishUS.chm::/EED_Element_Editor_Basic_Elements.htm)
