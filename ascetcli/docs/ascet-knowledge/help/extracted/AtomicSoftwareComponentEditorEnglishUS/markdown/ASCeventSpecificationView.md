# Event Specification View

The Event Specification view contains the following elements.

- Events field

Lists all events in the software component. If an event is of kind ModeSwitch or Timing, the modes available in all included SenderReceiver interfaces are listed below the event. Each mode can be activated/deactivated.

The [Event](ASCEventMenu.md) menu is also available as context menu in this field.

- ![](images/BUTTON.GIF) << and >>

These buttons are used to assign/deassign events to runnables.

- Event Kind combo box

Determines the event type. Available selections are:

| Column 1 | Column 2 |
| --- | --- |
| ModeSwitch | The event is triggered as exit or entry event of the assigned mode. |
| OperationInvoke | This event kind is necessary for server runnables. |
| Timing | periodic event |

- Mode Switch Settings field

Only visible if the event kind Mode Switch Settings is selected.

- entry and exit options

These options determine whether the runnable is started if the system enters or exits the assigned mode.

- Assigned Mode combo box

Assigns a mode to the event.

- Timing Settings field

Only visible if the event kind Timing is selected.

- Period field

The period in seconds.

- Runnables field

Lists all runnable entities in the software component. The runnables can be expanded to see the associated events.

The [Runnable](ASCRunnableMenu.md) menu is also available as context menu in this field.

See also

[Specifying Events](ASCSpecifyingEvents.md)
