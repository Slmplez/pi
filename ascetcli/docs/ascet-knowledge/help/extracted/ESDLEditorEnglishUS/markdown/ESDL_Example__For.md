# Example: For

The example is a simple combination of an if…else statement and a for loop:

if (log) {

for (index=0; index < array.length(); index++) {

array[index] = index * index; }

}

else {

for (index=0; index < array.length(); index++) {

array[index] = index; }

}

The example writes values to an array. The log condition in the if…else statement determines which of the two loops is used to write values to the array.

Each of the loops iterates over the entire array and assigns a value to each cell. The value is either the result of index * index or the value of index.

If the Max Number of Loop Iterations option in the project properties, Experiment Code node, of the associated project is set to a value > array.length() or to 0, all array elements are written.

If Max Number of Loop Iterations is set to a value < array.length(), the loop stops when Max Number of Loop Iterations is reached. Array elements with index > Max Number of Loop Iterations + 1 remain empty.

See also

[Project Editor - Experiment Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)
