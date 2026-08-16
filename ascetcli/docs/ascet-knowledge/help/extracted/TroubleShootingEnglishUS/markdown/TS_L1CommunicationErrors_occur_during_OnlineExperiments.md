# L1-Communication Errors during Online Experiments

L1-Communication Errors often occur during online experiments

In this case the priority of the communication process is too low. The priority of this process can be raised for the target in the file es1130cp.inv, es1130cp_gnu.inv or es1135cp_gnu.inv in the respective target directory. The file you have to edit depends on your target/compiler combination.

This file is used in the configuration of the compiler. Here you can modify the priority of the communication process by setting the parameter __L1_Prio = to the desired priority (by default it has the lowest priority, i.e. 0).
