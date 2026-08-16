# Preparing to Log All Value Changes

Data logging in Log all value changes mode requires a special setting in the project properties. If you want to log data in Periodic Sampling or Periodic to File mode, you do not have to modify the code generation settings.

To prepare for logging all value changes, proceed as follows:

1. Open the project you want to experiment with.
1. In the project editor, click on the ![](button_selcodeopt.gif) Project Properties button.

The Project Properties dialog window opens in the Build node.

1. Open the Experiment Code node.
1. Activate the Enable logging of all data changes option to switch on data logging.
1. Click OK.
1. Generate the code for the project and open the desired experimentation environment.

It is possible to generate code with or without logging of all value changes enabled. When you generate code with logging of all data changes enabled, the code will run more slowly, regardless of whether you are logging data or not.

See also

[The Data Logger](data_logger.md)
