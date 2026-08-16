# Value Tab

The Value tab contains the following elements. Most of them are not available for logical values, enumerations, and automatically generated state variables.

##### Use Implementation Type option and combo box

The option decides whether an implementation type with predefined parameters is used. When the option is activated, the input fields/options in the Implementation field are disabled.

The combo box is used to select an available implementation type. Possible values are all implementation types defined in the associated project.

##### Implementation field

This field is used to specify an individual implementation. It contains the Transformation, Master, Model, and Implementation fields.

Transformation field

- Formula combo box

Used to select a quantization formula. Possible values are all formulas defined in the associated project.

- Rescalable option

This option determines if the implementation can be rescaled (activated) or not. See [Rescalable Implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm) for details.

The Rescalable option can be used only for elements of type cont. The option must be deactivated for elements of other types (log, limitInt, wrapInt, sdisc, udisc, enum).

- Conversion field

Displays the selected formula.

- Quantization Calculated field

Displays the quantization calculated from the model and implementation data and the formula.

- Quantization Qu. Exp. field

Used to enter a quantization.

Master field

Here, you select whether the model or the implementation field of an implementation is used as the starting point for automatic updates.

- Model option

The Model field is used as starting point.

- Implementation option

The Implementation field is used as starting point.

Model field

- Type field

Displays the model data type of the element.

- Min. field

Lower limit of the physical interval.

- Max. field

Upper limit of the physical interval.

Implementation field

This field is also available for logical values.

- Type combo box

Used to select the implementation data type of the element. If available, [customized data type names](ComponentManagerEnglishUS.chm::/CM_CustomizeDataTypeNames.htm) are displayed in the combo box.

- Min. field

Lower limit of the interval.

- Max. field

Upper limit of the interval.

##### Implementation Interval Adaptation field

Used to set the limiting behavior.

- Limit Assignments option

If this option is activated, the limits defined in the Min. and Max. fields are considered when the code generator makes assignments to this variable. The option does not influence later assignments.

It is recommended that this option is activated by default. You should deactivate it only when you are sure that the limits are never exceeded.

- Limit to maximum bit length option and combo box

If activated, the result of an operation is limited in case of overflow. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Automatic | Overflow handling depends on the use of arithmetic services. |
| Keep Resolution | Resolution shall not be reduced upon limiting. |
| Reduce Resolution | Resolution can be reduced upon limiting. |

The following window elements are also available for logical values and state variables.

##### Memory Location of Instance combo box

Used to select the memory area where the element, or the instance of an included component, is located. Possible values depend on the target selected in the associated project or default project.

##### Memory Location of Reference combo box

Only available for explicit references.

Used to select the memory area where the explicit reference is located. Possible values depend on the target selected in the associated project or default project and - in case of a referenced item - the internal access settings of the explicit reference.

##### Memory Location of Search Result combo box

Only available for distributions.

Used to select the memory area where the distribution search results (see also [Group Table and Distribution](IntroductionEnglishUS.chm::/INT_group_table_and_distribution.htm)) are located. Possible values depend on the target selected in the associated project or default project.

##### Memory Segment combo box

In a project context with an ASCET-SE target, this combo box is used to select a memory segment. See the ASCET-SE user's guide, chapter "Memory Segments", for more information.

In a project context with the ES1135 experimental target, this combo box is used to set up [cache locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm).

##### Consistency field

Displays warnings and error messages.

See also

[Implementation Editor for Scalar Elements, Arrays and Matrices](IEd_Impl_Editor_for_Scalar_Nonlogical_Elements.md)

[Implementation Editor for Characteristic Lines and Maps](ied_implementation_editor_non-scalar_elements.md)

[Rescalable Implementations](IntroductionEnglishUS.chm::/INT_RescalableImplementations.htm)

[Customizing Data Type Names](ComponentManagerEnglishUS.chm::/CM_CustomizeDataTypeNames.htm)

[ES1135: Cache Locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm)
