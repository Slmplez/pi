# Messages

Messages form the input and output variables of processes and are used for inter-process communication. Unlike global variables, messages are protected variables in preemptive scheduling. If two concurrent processes both access the same message, data consistency is guaranteed, because each process works on its own copy. Messages are only available in modules. Depending on their usage, there are three different types of messages:

- Receive messages (message type symbol ![](symboltyp_msgrec.gif)) can only be read. Receive messages are used as inputs to a module.
- Send messages (message type symbol ![](symboltyp_msgsend.gif)) can only be written to. They are used for the results of the computations of a module.
- Send & Receive messages (message type symbol ![](symboltyp_msgsendrec.gif)) can be read from and written to.

The first figure shows scalar messages in the block diagram editor. The colored arrow symbols mark the directions of the messages. Scope and other properties, which are marked by certain symbols on variables and parameters, are not marked.

![](basisel_msg.gif)

The second figure shows non-scalar messages in the block diagram editor. The colored symbols mark the directions of the messages. Scope and other properties are not marked.

![](basisel_msg_nonsc.gif)

For exported and local messages of scalar, array or matrix type, [calibration access](ElementEditorEnglishUS.chm::/EEd_CalibrationAccess.htm) is set to read-only in the screenshots, indicated by the black bar at the left end of the message icons. Changing the calibration access makes the display change as shown for variables in [Basic Scalar Elements](BlockDiagramEditorEnglishUS.chm::/BDE_Basic_Scalar_Elements.htm).

Imported messages of the said types will inherit their properties from their exported counterparts.
