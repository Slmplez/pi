# Ports and Interfaces

In the VFB model, software components (SWC) interact through ports which are typed by interfaces. The interface controls what can be communicated, as well as the semantics of communication. The port provides the SWC access to the interface. The combination of port and port interface is named AUTOSAR interface.

There are two classes of ports:

- Provided ports (Pports) are used by an SWC to provide data or services to other SWC. Pports are implemented either as sender ports or as server ports.
- Required ports (Rports) are used by an SWC to require data or services from other SWC. Rports are implemented either as receiver ports or as client ports.

In the following, AUTOSAR ports are referred to as Rports or Pports, to avoid confusion with non-AUTOSAR ports.

The current ASCET version supports the following interface types:

- Sender-receiver (signal passing)
- NVData (same as Sender-receiver, but all interface elements are non-volatile)
- Client-server (function invocation)
- Calibration

Each Pport and Rport of an SWC must define the interface type it provides or requires.

If a system is built from SWC instances, the Rports and Pports of the instances are connected. One sender must be connected with one or more receivers, one client with one server, and one calibration parameter must be mapped to one imported parameter.

See also

[Sender-Receiver Communication](ASCsenderReceiverCommunication.md)

[Client-Server Communication](ASCClientServerCommunication.md)

[Calibration](ASCcalibration.md)
