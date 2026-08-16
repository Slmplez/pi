# Defining a Multipart Trigger

The condition can have several parts which are combined by a logical and or a logical or. To define a multipart trigger, proceed as follows:

1. Open the Define display trigger condition window.
1. Select a trigger mode by clicking the Analogue channels or the Bit channel option.

Trigger conditions can only be defined for either analog or bit channels.

1. Define the first part of the trigger condition.

The procedure is the same as for simple triggers (see [Defining Simple Trigger Events](define_simple_trigger_events.md)).

1. In the Combination combo box, select & (and) or | (or) as operation.
1. Define the second part of the trigger condition.

Repeat the necessary steps if you want to add more parts.

1. Click on OK.

The trigger condition is now defined. It is automatically, and will be used when you start the experiment.

Since the oscilloscope buffers the values even if the trigger condition is not yet fulfilled, values can be displayed afterwards for a definable time (pre-trigger time) before the trigger event happens. The post-trigger time determines the length of time for which the values are shown after the trigger event has happened. The pre- and post-trigger time is collected along the extent of the time axis on the oscilloscope window. If, for instance, the time axis extent of the oscilloscope window is set to 2 seconds, and the ratio between pre-trigger and post-trigger time is 0.4/0.6, the pre-trigger time is 0.8 seconds, and the post-trigger time is 1.2 seconds.

See also

[Defining Simple Trigger Events](define_simple_trigger_events.md)

[Setting Pre-/Post-Trigger Time](set_pre_post_trigger_time.md)

[Activating/Deactivating a Trigger](activate_deactivate_trigger.md)

[Actuating the Trigger Manually](actuate_trigger_manually.md)
