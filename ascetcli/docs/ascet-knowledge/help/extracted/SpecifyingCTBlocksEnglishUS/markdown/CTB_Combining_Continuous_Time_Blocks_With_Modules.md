# Combining Continuous Time Blocks With Modules

Discrete modules in a project communicate via messages (global variables in ASCET blocks). There are no explicit connections (connecting lines) between Send and Receive messages; they are assigned to each other by their names.

Continuous time blocks, on the other hand, communicate among themselves and with modules via connections that have been specified graphically. The connections are built using the same method as in block diagrams.

![](DIA0090.bmp)

For discrete modules, the user has to explicitly define the tasks and to assign the processes defined in the module editor to the appropriate tasks.

CT blocks do not require an explicit definition of tasks, because these are defined automatically when needed. A simulate task and an event task are generated for each CT block. In addition, a common init task and a common terminate task are generated for all CT blocks in a project. For the example above, the following tasks are generated automatically:

- simulate_CT1 (plant_1)
- simulate_CT2 (plant_2)
- event_CT1 (plant_1)
- event_CT2 (plant_2)
- initialize_CT (plant_1 ... plant_n)
- terminate_CT (plant_1 ... plant_n)

These predefined tasks are static. They are all defined as cooperative tasks. The following sections describe the meaning of these tasks in more detail.

See also

[simulate_CTn Tasks](CTB_simulate_CTn_Tasks.md)

[event_CTn Tasks](CTB_event_CTn_Tasks.md)

[initialize_CT Task](CTB_initialize_CT_Task.md)

[terminate_CT Task](CTB_terminate_CT_Task.md)
