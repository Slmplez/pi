# The Event Generator

In an online experiment the various tasks and processes of a project are scheduled by the real-time operating system. During offline experiments the scheduling is simulated by the event generator. The event generator determines which methods or processes of the component under experimentation are activated in which order and in which mode. An event has to be defined for each method or process that is to be activated.

Methods or processes for which no event has been enabled are not activated and therefore will have no influence on the experiment.

Methods with composite arguments, i.e. array, matrix or component arguments, do not appear in the event generator. No event can be created for them.

In addition to the events for the methods and processes, a generateData event is always created by default. This event triggers the generation of data that have been defined in the data generator. If your experiment does not require any data to be generated, you can leave this event disabled, otherwise it must always be enabled.

See also

[Setting up the Event Generator](EE_setup_eventGenerator.md)

[Setting up an Event](setup_event.md)

[Setting up an Event Directly](setup_event_directly.md)
