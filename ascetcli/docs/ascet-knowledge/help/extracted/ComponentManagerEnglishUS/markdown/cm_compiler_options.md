# Compiler Options

The Compiler node contains subnodes for the existing compilers. By default, these are Borland-C V4.5, Borland-C V5.5, GNU-C V3.4.4, MinGW GNU 4.7.2, Microsoft Visual C++ (2 versions) and QCC V6.* (2 versions).

Of these, only the MinGW GNU 4.7.2 compiler is provided with ASCET.

If you install ASCET-RP or ASCET-SE, additional compiler nodes are added.

Most options are available for all compilers, some are compiler-specific. For the meaning of the options, refer to the descriptions in the Options window.

The options of each compiler are stored in a compiler declaration file. This is an XML file named <compiler>.acd.xml. All compiler declaration files are stored in the ASCET<n>\tools\compiler directory (where <n> is the ASCET version number).
