# Setting Period, Delay, and Max. Number of Activations

##### Period

The period value determines how often the task is activated. If, for instance, the period value is 0.01, the task will be activated once every hundredth of a second.

- Type a period value in seconds into the Period(s) field.

This setting is only available for alarm tasks.

When you are using an ASCET-SE target with RTA-OSEK or Generic-OSEK operating system, the period is converted to the next highest integer number of system ticks. This number is displayed in the Resulting Period field, in the selected unit (Seconds [s] or Ticks [t], cf. [Operating System Settings (RTA-OSEK + Generic OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)), and used as period.

##### Delay

When a Delay is specified, the respective task will be activated for the first time after the set delay time. If the delay is 0, the task will be activated once the program starts, and then at the beginning of every period.

- Type a delay value in seconds into the Delay field.

This setting is only available for alarm tasks.

When you are using an ASCET-SE target with RTA-OSEK or Generic-OSEK operating system, the delay is converted to the next highest integer number of system ticks. This number is displayed in the Resulting Delay field, in the selected unit (Seconds [s] or Ticks [t], cf. [Operating System Settings (RTA-OSEK + Generic OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)), and used as delay time.

##### Maximum Number of Activations

The Maximum number of Activations value determine how many times a task can be activated in parallel. If a task is re-activated before it has finished the execution following its previous activation, it is double activated. To save system resources, the maximum number of concurrent activations for each task can be limited.

- Adjust the value in the Maximum No. of Activations field.

This setting is available for alarm and software tasks.

See also

[Operating System Settings (RTA-OSEK + Generic OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)

[Selecting the Task Type](triggermode.md)

[Assigning a Priority](PE_priority.md)

[Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)

[Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)

[Selecting a Trigger (ISR Source)](PE_trigger.md)

[Setting the Autostart Option](setautostart.md)

[Setting Deadline and Minimum Period Options](setdeadline.md)

[Setting Up Hook Routines](HookRoutine.md)
