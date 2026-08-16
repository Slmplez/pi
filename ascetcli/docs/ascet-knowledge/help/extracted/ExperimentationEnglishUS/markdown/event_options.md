# Event for Dialog Window

The Event for dialog window contains the following components.

- Mode combo box

Every event has a mode. There are four modes:

| Column 1 | Column 2 |
| --- | --- |
| segment | A segment event is used in automotive application where the triggering of the event depends on the rotational speed of the engine, see Setting up a Segment Event for details. |
| timeSynchron | A time synchronous event, triggered once at the beginning of every interval. The length of an interval is determined by the value set in the dT [s] field. |
| singleShot | A single event is triggered only once, when the simulation is started. This is useful e.g. for initialization methods. You can re-trigger the singleShot event, by choosing Reactivate Event from the Channels in the Event Generator window. |
| signalled | An asynchronous event, stimulated with the data of a real measurement. Thus, real-world data can be used as trigger even during offline experimentation (see Setting up an Asynchronous Event ). |

- Prio field

Used to enter the event priority. The priority of an event determines the order in which events are calculated. Often several events are assigned to the same time frame, e.g. 10 milliseconds. In that case the event with the highest priority (i.e. the highest number) is triggered first, the other ones are triggered in turn.

- dT [s] field

The dT value of an event determines the interval in which it is triggered. If the dT value is 0.01 seconds, the event is triggered every 10 milliseconds. The smallest possible dT value is one microsecond (10-6 seconds).

![](BUTTON.GIF) OK

Closes the window and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the window without accepting the settings.

See also

[Setting up a Segment Event](setup_segment_event.md)

[Setting up an Asynchronous Event](setup_asynchronous_event.md)

[Setting up a Dependent Event](setup_dependent_event.md)
