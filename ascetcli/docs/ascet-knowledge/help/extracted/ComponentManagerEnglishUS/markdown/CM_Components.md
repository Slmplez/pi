# Components

The specification of an embedded software system in ASCET is made up of components. A component is a modular piece of functionality which contains algorithms and data. The different algorithms specified within a component can be executed independently of each other. The components of an Embedded Control System can be combined into projects.

On a physical level, components are specified either graphically as block diagrams or state machines, or in ESDL-Code. Alternatively, they can be specified in C code. Components that are specified either graphically or in ESDL are implementation-independent, i.e. they can be used to generate code for different platforms. Components specified in C code are always platform-dependent. They encapsulate target-specific behavior.

For more information on the types of component available in ASCET and their usage, see [Overview - Components](introductionenglishus.chm::/INT_Overview_Components.htm) and references therein.
