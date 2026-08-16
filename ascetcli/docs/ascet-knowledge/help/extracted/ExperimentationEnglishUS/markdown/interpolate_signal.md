# Interpolating the Signal

Each time data is generated in the experiment (see [Setting up the Event Generator](EE_setup_eventGenerator.md)), the signal is evaluated. If the actual time stamp falls between two signal points, the lower signal value is assigned to the channel by default. As an alternative, you can select linear interpolation.

To interpolate the signal, proceed as follows:

1. In the data generator, open the Signal menu and select Interpolate.
1. Start the experiment.

The assigned value is linearly interpolated from the signal points enclosing the actual time stamp.

See also

[Setting up an Event](setup_event.md)

[Setting up the Event Generator](EE_setup_eventGenerator.md)
