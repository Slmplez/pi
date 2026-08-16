# Exclusive Areas

Software components that need to provide mutual exclusion over data shared by two (or more) of their runnable entities do so by configuring exclusive areas. The RTE generator uses exclusive area configuration to create operating system configuration files and to optimize exclusive areas. For example, if the only components that access a region are mapped to the same task then the entire region can be elided.

ASCET automatically creates an exclusive area in a software component, which is always called ASCET_exclusive_area. The user can additionally create exclusive areas by means of ASCET resources (see [Creating an Exclusive Area](ASCcreateExclusiveArea.md)). ASCET defines exclusive areas with explicit access (access macros [RTE_Enter and RTE_Exit](ASCrteEnterRTEExit.md)). Explicit access is similar to a standard resource in OSEK OS.

The scope of any user-defined exclusive areas is the software component instance. It is not possible to define exclusive areas that cross software component boundaries.

Each runnable can declare if it uses one of the named exclusive areas. There are two alternative ways to use exclusive areas in ASCET:

1. Modeling with ASCET messages and use the exclusive area ASCET_exclusive_area.
1. Assigning sequences of a runnable entity in a user-defined exclusive area.

See also

[Creating an Exclusive Area](ASCcreateExclusiveArea.md)

[Using Exclusive Areas](ASCusingExclusiveAreas.md)

[RTE_Enter and RTE_Exit](ASCrteEnterRTEExit.md)

[Introduction - Resources](IntroductionEnglishUS.chm::/INT_resources.htm)
