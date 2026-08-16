# Settings Tab

This tab contains the following elements.

Can be Invoked Concurrently option

If activated, the RTE can optimize invocation of the current runnable by clients on the same ECU to a direct function call. This means that no queuing is required (or possible) and therefore multiple invocations of the server runnable can occur concurrently.

Minimum Start Time (ms) field

The activation of a runnable is delayed by the specified time (in milliseconds) to prevent that the runnable is started more than once within the interval.

Runnables invoked by an OperationInvoked event cannot be delayed. For these, the Minimum Start Time value must be 0.
