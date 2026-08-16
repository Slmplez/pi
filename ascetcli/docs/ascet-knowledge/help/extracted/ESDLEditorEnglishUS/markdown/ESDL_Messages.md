# Messages

In ASCET, an additional concept of messages as real-time language constructs is used for interprocess communication. Messages, in this sense, are used as protected global variables in the real-time environment.

Messages are available only in modules. From within a module, a message is merely a variable that can be read, written to, or both. Whenever a process runs, the operating system creates copies of all its messages. These copies are accessible only to that instance of the process that created them.

Hence, if the same message is used by various processes, each process gets its own copy of the message. This strategy is used by the real-time operating system to ensure data consistency over multiple processes.

Messages are fully supported in ESDL, they can be used in all modules. A message is added like all other elements in the Elements list by selecting the corresponding icon from the ESDL Editor toolbar. Messages can be added as

- send messages—the current module can write to this variable,
- receive messages—the current module can read this variable, or
- send and receive messages—the current module can read and write to this variable.

In ESDL, messages are accessed through assignment statements:

theVar = receiveMsg + 1.24;

sendMsg = 12;

theMessage = 3 * tmpVar;

The table summarizes the public methods available for messages.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| receive () | void | read message |
| send () | void | write message |
