# Experiment Options

The Experiment node contains options for offline and online experiments. Options for the integration method for CT blocks are collected in the [CT-Solver](CM_CTSolverOptions.md) subnode.

##### Initialize Variables at OS Start

Determines whether variables are initialized at each start of the simulation (offline experiment) or the operating system (online experiment).

##### Initialize Parameters at OS Start

Determines whether parameters are initialized at each start of the simulation (offline experiment) or the operating system (online experiment).

##### Activate Monitor Fading

If activated, element monitors that have not changed for a specified time will fade.

##### Monitor Fading Time [sec]

Determines the time element monitors must be unchanged before fading begins. 0 means fading is switched off.

##### Activate Monitor Refresh Delay

If activated, refreshing event monitors is delayed for a specified time.

##### Monitor Minimum Refresh Delay [msec]

The minimum delay for refreshing element monitors. 0 means the delay is switched off.

##### Automatic Monitor Mode

If activated, monitors are assigned to all elements in the currently loaded part (e.g., diagram, hierarchy level, ...) of the block diagram.
