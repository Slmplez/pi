# Dependent Parameters in the Experiment

The initialization value of a dependent parameter is calculated during code generation. During an experiment, a dependent parameter is updated according to the following scheme when the non-dependent parameters it depends on (the "master" parameters) change their values:

- the value of a "master parameter" is changed in a [calibration editor](calibrating_element.md)

All dependent parameters that depend on the "master parameter" are re-calculated immediately. If a dependent parameter is shown in a measurement or calibration window, the value is updated.

Dependent parameters that do not depend on the changed "master" parameter are not re-calculated.

- the value of a "master" parameter is [read from a file](EE_readData_externalFiles.md)

All dependent parameters that depend on the "master parameter" are re-calculated immediately. If a dependent parameter is shown in a measurement or calibration window, the value is updated.

Dependent parameters that do not depend on the changed "master" parameter are not re-calculated.

- parameters are [reinitialized](read_write_current_dataset.md)

The values calculated during code generation are reassigned to those dependent parameters whose values have been re-calculated at least once during the experiment.

Dependent parameters whose values were not re-calculated are not reinitialized.

- See also
- [Introduction - Dependent Parameters](IntroductionEnglishUS.chm::/INT_dependent_parameters.htm)

[Calibrating an Element](calibrating_element.md)

[Reading or Writing Data from the Current Data Set](read_write_current_dataset.md)

[Reading Data from External Files](EE_readData_externalFiles.md)
