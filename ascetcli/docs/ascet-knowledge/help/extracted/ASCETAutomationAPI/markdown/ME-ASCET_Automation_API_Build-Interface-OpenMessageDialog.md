| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenMessageDialog

##### Name

OpenMessageDialog

##### Description

Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running")

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| theMessage | string | Input |  |
| theTitel | string | Input |  |

##### Parameters

theMessage

**Type:**string

theTitel

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1027 Message box already open.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
