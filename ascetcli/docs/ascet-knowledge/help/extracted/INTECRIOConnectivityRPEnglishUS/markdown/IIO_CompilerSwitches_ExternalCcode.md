# Compiler Switches for External C Code

It is sometimes necessary to bracket parts of external C code in target-specific compiler switches. For that purpose, ASCET provides the following switches:

- ES910
- ES1130
- ES1135
- ES113x (for ES1130 and ES1135)

If the Prototyping target is selected, the (test) compilation is performed with the ES1135 switch.

The syntax is as follows:

#ifdef ES1135

...

/* ES1135-specific code */

...

#endif
