# Enabling Concurrent Invocation of a Server Runnable

When a server runnable is set to be invoked concurrently, the RTE can optimize invocation by clients on the same ECU to a direct function call. This means that no queuing is required (or possible) and therefore multiple invocations of the server can occur concurrently.

Proceed as follows to allow concurrent invocation:

1. In the Outline tab, select the server runnable you want to modify.
1. Do one of the following:
1. Open the Settings tab.
1. Activate the Can be Invoked Concurrently option.
1. In the Minimum Start Time field, enter the start time in milliseconds.
1. Click OK to close the signature editor.

See also

[Editing the Signature of a Runnable or Method](asceditsignature.md)
