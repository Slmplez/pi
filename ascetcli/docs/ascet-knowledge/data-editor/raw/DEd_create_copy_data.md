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

[Opening a Data Editor](DEd_open_editor.md)
