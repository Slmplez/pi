# Calibration

Calibration interfaces are used for communication with Calibration components.

Each calibration interface can contain multiple calibration parameters. A port of a software component that requires an AUTOSAR calibration interface to the component can independently access any of the parameters defined in the interface by making an RTE API to the required port. Calibration components provide the calibration interface and thus provide implementations of the calibration parameters.

In ASCET, the Calibration Interface component is used to specify communication with Calibration components. The Calibration interface components are inserted into SWC as Calibration interface prototypes. They can be connected to appropriate diagram elements (see [Accessing Calibration Parameters](ASCaccessCalibrationParameters.md)).

See also

[Basics - Calibration Interfaces](senderreceivereditorenglishus.chm::/SREBasicsCalibrationInterfaces.htm)

[Accessing Calibration Parameters](ASCaccessCalibrationParameters.md)

[Specifying a Calibration Interface Prototype](ASCspecifyCalibrationInterfacePrototype.md)
