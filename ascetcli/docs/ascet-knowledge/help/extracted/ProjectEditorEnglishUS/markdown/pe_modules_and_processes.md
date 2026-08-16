# Modules and Processes

The processes assigned to tasks are defined in the context of modules. A module encapsulates a number of related processes, e.g. processes that belong to a lambda control function. The functionality described in a module can be split into several processes, since different parts of a control algorithm may be computed at different times. This greatly reduces the execution time for the control algorithms, since only the most sensitive parts of the algorithms need to be computed at the highest frequency. At the same time the descriptions of the algorithms are not distributed, which makes them easier to develop, maintain and understand.

The functionality of a complex control task can be distributed over several modules which can be modelled hierarchically. For further refinement classes and state machines can be used for sub-algorithms or service routines (e.g. accumulator, pi-control etc.)

Modules are exclusively used by projects and are the top level components within a project. Usually, modules are used to describe a unique part of a project, e.g. a lambda control. Therefore modules can have only one instance inside a project, in contrast to other components, which can have any number of instances (e.g. accumulators).

Like all other components, modules have an interface. The interface of a module consists of its processes and the messages which are used for data exchange.

See also

[Interprocess Communication](pe_interprocess_communication.md)

[M](PE_MessageCopySemanticsExperiment.md)essage Copy Semantics for Experiment Code

[Overview - Components](IntroductionEnglishUS.chm::/INT_Overview_Components.htm)

[Processes](PE_processes.md)

[Messages](IntroductionEnglishUS.chm::/INT_messages.htm)
