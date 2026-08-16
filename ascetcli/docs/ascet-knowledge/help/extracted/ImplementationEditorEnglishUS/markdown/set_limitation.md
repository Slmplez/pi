# Setting the Limitation

To set the limitation, proceed as follows:

- Activate the Limit Assignments option.

You have thus determined that the value range of a variable, defined by Min and Max, is considered when the code generator makes assignments.

Code generation with Physical Experiment ignores the option.

A variable value is limited by the value range. If the assigned value is out of range, the relevant Min or Max limit value is used

or

- Deactivate the Limit Assignments option.

You have thus determined that the defined value range of a variable is not considered when the code generator makes assignments.

In this case, the value of a variable is not limited by the value range, the maximum limit is determined by the implementation data type (int8, int16, etc.).

See also

[Project Editor - Build Node](ProjectEditorEnglishUS.chm::/Build_Options.htm)

[Limitations](IEd_Limitations.md)
