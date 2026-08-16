# Logging Options Window

This window is opened from the data logger window, via the Options menu, Logging Options menu option.

The Logging Options window contains the following elements.

##### Logging Mode field

- Log all value changes option

If activated, all changes of each logged variable are logged. See also [The Data Logger - Log All Value Changes](data_logger.md#AllValues).

- Log only last value change per time stamp option

Only available when Log all value changes is selected.

If activated, this option ensures that only the last change in a time stamp is logged for each logged variable.

- Periodic Sampling option

If activated, logging is triggered by a particular task. See [The Data Logger - Periodic Sampling](data_logger.md#PeriodicSampling).

- Periodic to File option

If activated, logging is triggered by a particular task, and the data is transferred to the PC host at regular intervals. See [The Data Logger - Periodic to File](data_logger.md#PeriodicToFile).

- Log at combo box

Not available when Log all value changes is selected.

Used to select the task that triggers Periodic * data logging.

Online experiment: all tasks defined in the project Offline experiment: a single entry that cannot be changed

##### Data Transport to Host field

- Continuous Polling option

If activated, the logging values that are stored on the target ring buffer are written to the host-PC at regular intervals.

- Cycle Time field

Only available when Continuous Polling is selected.

Defines the period for continuous polling.

- Data Rate field

The data rate setting determines how many values per polling interval are read for each logged variable.

##### Storage Format field

- MDF and FAMOS options

These options are used to select a storage format for the log file.

- Host Logging Buffer field

Not available when Periodic to File is selected.

Used to adjust the size in samples for the host logging buffer.

Target Logging Buffer field

Used to adjust the size in samples for the target logging buffer.

Total Buffer field

Used to adjust the total memory in kB for the target logging buffer.

information area

Lists the maximum number of logging channels and the limiting factor.

![](BUTTON.GIF) OK

Closes the window and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the window without accepting the settings.

You can

[Select the Logging Mode](logging_mode.md)

[Set Up Data Transfer to the Host](data_transfer_host.md)

[Set Up the Target Buffer](target_register_buffer.md)

[Select an Output Format](output_format.md)

See also

[The Data Logger](data_logger.md)
