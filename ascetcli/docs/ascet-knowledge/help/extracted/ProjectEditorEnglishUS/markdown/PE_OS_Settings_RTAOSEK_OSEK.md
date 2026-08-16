# Operating System Settings (RTA-OSEK + Generic-OSEK)

This instruction is valid for a target with RTA-OSEK or GENERIC-OSEK operating system.

To set up the operating system, proceed as follows:

1. Click on the OS tab in the project editor to open the operating system editor.
1. In the Preemp. Levels and Coop. Levels fields, set the number of co-operative and pre-emptive levels for the project.
1. Use the Seconds [s] and Ticks [t] options to specify whether the time is given in seconds or system ticks.
1. In the Tick Duration field, enter the system tick duration in nanoseconds.

You have to provide the hardware configuration, e.g., via the initBoard() function. In addition, you have to define a counter object (SYSTEM_COUNTER) in the initial OIL file (i.e. conf.oil).

The Tick Duration value is the interval at which the counter ticks. This value determines the raster for activations via alarm.

See also

[OS Tab](PE_OS_Tab.md)

[Copying Operating System Settings](copyos.md)
