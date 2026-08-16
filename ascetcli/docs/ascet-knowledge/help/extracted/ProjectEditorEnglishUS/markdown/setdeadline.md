# Setting Deadline and Minimum Period Options

This instruction does not apply to targets with RTA-OSEK or GENERIC-OSEK operating system.

To set Deadline and Min. Period options, proceed as follows:

1. Activate the Deadline option to make sure that two consecutive task activations do not exceed a certain time difference.

The associated input field becomes available.

1. Enter the maximum difference in seconds between two activations.

The Deadline option is available for alarm and software tasks.

1. Activate the Min. Period option to make sure that two consecutive task activations do not fall below a certain time difference.

The associated input field becomes available.

1. Enter the minimum difference in seconds between two activations.

The Min. Period option is available only for interrupt tasks.

- See also
- [Selecting the Task Type](triggermode.md)
- [Assigning a Priority](PE_priority.md)
- [Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)
- [Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)
- [Selecting a Trigger (ISR Source)](PE_trigger.md)
- [Setting Period, Delay, and Max. Number of Activations](others.md)
- [Setting the Autostart Option](setautostart.md)
- [Setting Up Hook Routines](HookRoutine.md)
- (item)
