# The Monitoring Option

The monitoring option provides three variables for every task to be used for monitoring and debugging purposes during experiments with projects, as well as one further variable for monitoring of all tasks. The variables are created automatically when the Enable Monitoring option is active, and when monitoring was selected from the pre/post hooks combo box for the task during task setup. This has to be done individually for each task for which monitoring variables are to be generated. The following three task-specific monitoring variables are generated:

cycleStartTime_<taskname>

Shows the point in time in seconds the task was last activated.

cycleTime_<taskname>

Shows the time in seconds required for executing the task.

dT_<taskname>

Shows the time difference between the previous and the current activation of the task in seconds.

In addition, the following variable is created once for all tasks:

runtime_violation

Shows the number of times the task has not met its schedule.

See also

[Setting Up Hook Routines](HookRoutine.md)
