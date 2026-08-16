# Enabling or Disabling Elements

It is possible to enable individual elements within a component. Enabling an element means that the element can be accessed from outside of the current component. Parameters and constants can be read out from the current component. Variables, however, can be read in and out.

To enable or disable elements, proceed as follows:

1. Open the properties editor.
1. Click on the Set() Method option.
1. Click on the Set() Method option again to reverse the setting.
1. Activate the Get() Method option to add an output.
1. Click OK.

In the layout, an input or output is added for the element.

You have to actively set the Get() Method and Set() Method options for messages to add the respective inputs and outputs to the module layout. However, these are merely a visualization feature, assignment is performed using identical names. When you are using Get/Set ports without activating one of the Optimize Direct Access Methods (...) code optimization options, separate methods for the direct access on the respective elements are created in the generated code, which are called via function calls. When the Optimize Direct Access Methods (one level) option is activated, the direct access is used instead of separate methods. When the Optimize Direct Access Methods (multiple levels) option is activated, this is also true for nested classes.

The type of pin displayed in the layout depends on the kind of element being enabled. For parameters (including characteristic lines and maps), constants and system constants, as well as send messages, only an output pin can be added. For receive messages, only an input can be added. For variables, as well as send & receive messages, both an input and an output pin can be added.

See also

[Project Editor - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)
