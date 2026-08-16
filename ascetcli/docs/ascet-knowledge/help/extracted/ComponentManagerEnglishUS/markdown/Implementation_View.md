- Implementation View

When you select the Implementation view, the 3 Contents field displays the Implementation tab. This tab contains the following columns and window elements:

- Combo box

Each dimension (X, Y, Value) of a characteristic curve/map is implemented individually. Therefore, each dimension is listed in a separate row in the tab.

- Name

This column contains names and kind/scope symbols of the elements in the selected component. For messages, message type symbols are shown instead of kind/scope symbols.

- Type

This column contains types and type symbols of the elements in the selected component. For messages, the type symbol represents the data type of the message (e.g. ![](symboltyp_cont.gif), ![](symboltyp_array.gif) etc.), not the message type (send, receive, send & receive).

- Impl. Type

This column contains the implementation data type. If available, [customized data type names](CM_CustomizeDataTypeNames.md) are shown.

- Impl. Min

This column contains the lower limit of the implementation interval.

- Impl. Max

This column contains the upper limit of the implementation interval.

- Q

This column shows the quantization used in the Quantized Physical Experiment.

- Formula

This column contains the names of the transformation formulas of the elements. Possible values are all available formulas.

- Limit to max bit length

This column shows whether operations are limited in case of overflow. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| No | no limitation |
| Reduce | limit result and reduce resolution |
| Keep | limit result and do not reduce resolution |
| Auto | overflow handling (keep or reduce resolution) is set automatically |

- Limit Assignment
- Memory Loc. Ref.

This column contains the memory area where the reference is located. Possible values depend on the target selected in the associated project or default project.

- Memory Loc. SR

This column contains the memory area where the distribution search results (see also [Group Table and Distribution](IntroductionEnglishUS.chm::/INT_group_table_and_distribution.htm)) are located. Possible values depend on the target selected in the associated project or default project.

- Memory Segment

In a project context with an ASCET-SE target, this column shows the selected memory segments. See the ASCET-SE user's guide, chapter "Memory Segments", for more information.

In a project context with the ES1135 experimental target, this column shows the current [cache locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm) settings.

- (item)
