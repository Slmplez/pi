# NVRAM Cockpit Window

The NVRAM cockpit contains [control elements](#Control) and [displays](#Displays).

##### Control elements:

- Update Interval [sec] slider

Use this slider to adjust the interval (in seconds) for the automatic update of the NVRAM content. You can set up to 30 seconds; an interval of 10 seconds is predefined.

The slider is activated only when automatic update is switched on.

- ![](BUTTON.GIF) Auto Update

This button switches the automatic update on and off. Automatic update is switched on if the button appears impressed, and switched off if the button appears upraised.

The automatic NVRAM content update works only while the experiment is running. Once you have stopped the experiment with Stop OS in the Experiment menu or with the Stop OS button, the NVRAM content can no longer be updated automatically.

- Consistency Level combo box

Use this combo box to select the consistency level of the update; see also [NVRAM: Data Consistency](IIO_NVRAM_DataConsistency.md).

- ![](BUTTON.GIF) Clear NVRAM

Use this button to delete the NVRAM content.

If you click Clear NVRAM while the automatic update is running, the NVRAM content is deleted, but it will be written again after the next update interval at the latest.

- ![](BUTTON.GIF) Update Now

Use this button to start the NVRAM content update manually.

This button is only available when automatic update is switched off.

The manual NVRAM content update works even if you stopped the experiment with Stop OS in the Experiment menu or with the Stop OS button.

##### Displays:

- Time since last Update [sec]

This bar display shows the time elapsed since the last update. The entire bar corresponds to 30 seconds; if this time is exceeded because automatic update is switched off, only the number is increased.

The counting of seconds continues even if the experiment is stopped, because time continues. Only a manual update after stopping the experiment resets the counter, which starts anew.

The bar is green as long as the time since the last update is less than 30 s, and red if this time is exceeded. Exception: The experiment was stopped (Stop ERCOS) prior to the overflow; in that case, the bar turns yellow upon overflow.

- Non Volatile Variables initialized from NVRAM

This display appears light-green (![](nvram_initdisplay_b.gif)) if the NV variables are initialized with the NVRAM content, and dark-green (![](nvram_initdisplay.gif)) if the NV variables are initialized with their default values.

- NVRAM Update running

This display appears light-green (![](nvram_initdisplay_b.gif)) if an NVRAM content update is currently running.

See also

[NVRAM Safety Information](IIO_NVRAMSafetyInformation.md)

[Working with the NVRAM Cockpit](IIO_Working_with_NVRAMCockpit.md)
