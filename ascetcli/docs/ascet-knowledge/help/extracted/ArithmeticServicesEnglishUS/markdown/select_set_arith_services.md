# Selecting a Set of Arithmetic Services

Selecting a set of arithmetic services takes place within the scope of a projects in ASCET.

To select a set of arithmetic services, proceed as follows:

1. Open the project to whose scope the arithmetic services you want to use apply.
1. In the project editor, click the Project Properties ![](button_selcodeopt.gif) button.

The Project Properties dialog window opens to the Build node.

1. In the Code Generator combo box, select the Implementation Experiment or Object Based Controller Implementation entry.

The settings in the Integer Arithmetic node are not available for Physical Experiment or Quantized Physical Experiment.

1. Open the Integer Arithmetic node.

All available sets of arithmetic services are listed in the Arithmetic Service set combo box.

1. Select the set you want to use from the combo box.

When a new project is created, the first set found in the current services.ini file is applied automatically for the project. If the current file does not contain any sets, or contains only an empty set, or the first set in the file is an empty set labeled [None], None is preselected automatically in the Arithmetic Service set combo box.
