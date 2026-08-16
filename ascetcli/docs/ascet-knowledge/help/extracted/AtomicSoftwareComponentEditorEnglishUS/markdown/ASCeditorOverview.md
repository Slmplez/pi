# Overview - Software Component Editor

AUTOSAR software components are generic application-level components that are designed to be independent of both CPU and location in the vehicle network. An AUTOSAR software component (SWC) can be mapped to any available ECU during system configuration, subject to constraints imposed by the system designer.

An AUTOSAR software component is therefore the atomic unit of distribution in an AUTOSAR system; it must be mapped completely onto one ECU.

Before an SWC can be created, its component type (SWC type) must be defined. The SWC type identifies fixed characteristics of an SWC, i.e. port names, how ports are typed by interfaces, how the SWC behaves, etc. The SWC type is named, and the name must be unique within the system. Thus, an SWC consists of the following parts:

- A complete formal SWC description that indicates how the infrastructure of the component must be configured.
- An SWC implementation that contains the functionality (in the form of C code or object code).

To allow an SWC to be used, it needs to be instantiated at configuration time. Furthermore, it is possible to configure an SWC in a way that it can be multiply instantiated. The distinction between type and instance is analogous to types and variables in conventional programming languages. You define an application-wide unique type name (SWC type), and declare one or more uniquely named variables of that type (one or more SWC instances).

The software component editor of ASCET allows defining and implementing the behavior of AUTOSAR-compliant vehicle functions in terms of software components. ASCET supports AUTOSAR SWC descriptions and the generation of AUTOSAR-compliant SWC production code according to AUTOSAR R3.0, R3.1, and R4.0.

Explaining AUTOSAR is not part of the ASCET online help. For questions regarding AUTOSAR details, refer to the ASCET AUTOSAR User's Guide and to the publications on the [AUTOSAR web site](http://www.autosar.org).

See also

[Ports and Interfaces](ASCportsInterfaces.md)

[Runnable Entities and Events](ASCRunnableEntity.md)

[Modes and Mode Groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm)

[http://www.autosar.org](http://www.autosar.org)
