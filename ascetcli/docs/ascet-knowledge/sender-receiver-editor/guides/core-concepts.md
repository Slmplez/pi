# Sender Receiver Editor Core Concepts

These pages cover the editor's main objects, basic concepts, and foundational terminology.

- [Basics - SenderReceiver and NVData Interfaces](../raw/SREeditorOverview.md)
  Context: `AUTOSAR Interfaces > Basics - SenderReceiver and NVData Interfaces`
  Note: Sender-receiver communication involves the transmission and reception of signals consisting of atomic data elements sent by one AUTOSAR software component (SWC) and received by one or more SWC.
- [Modes and Mode Groups](../raw/SREmodesModeGroups.md)
  Context: `AUTOSAR Interfaces > Basics - SenderReceiver and NVData Interfaces > Modes and Mode Groups`
  Note: AUTOSAR modes can be used to execute code when the RTE is started, e.g. to initialise internal data structures etc. Similarly, when a system is shut down your software component may need to store data, log operational details etc. A runnable entity can be activated on either entry or exit from a mode using a Mode Switch Event.
- [Basics - ClientServer Interfaces](../raw/SREBasicsClientServerInterfaces.md)
  Context: `AUTOSAR Interfaces > Basics - ClientServer Interfaces`
  Note: Client-server communication involves a component invoking a defined “server” function in another component which may or may not return a reply.
- [Basics - Calibration Interfaces](../raw/SREBasicsCalibrationInterfaces.md)
  Context: `AUTOSAR Interfaces > Basics - Calibration Interfaces`
  Note: Calibration interfaces are used for communication with Calibration components.
- [Filtering the Tree Pane](../raw/SREfilterComponentPane.md)
  Context: `AUTOSAR Interfaces > Instructions > General Editor Settings > Filtering the Tree Pane`
  Note: The Outline tab can be filtered. To do so, proceed as follows.
- [Toolbar General](../raw/SREtoolbarGeneral.md)
  Context: `AUTOSAR Interfaces > Reference to User Interface > Toolbars > Toolbar General`
  Note: The General toolbar contains the following buttons. Some buttons are unavailable in one or two of the AUTOSAR interface editors, and the button sequence may differ.
