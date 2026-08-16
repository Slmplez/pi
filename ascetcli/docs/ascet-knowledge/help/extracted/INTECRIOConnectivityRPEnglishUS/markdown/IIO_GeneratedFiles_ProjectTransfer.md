# Generated Files for Project Transfer

The following generated files are significant for working with INTECRIO. Further files are created during code generation; however, these further files are irrelevant for working with INTECRIO.

- <project name>.six

This file contains the description of the project interfaces in the XML-based language, SCOOP-IX.

The interfaces of a possible HWC module are not included in the SCOOP-IX file because hardware configuration is done in INTECRIO.

A SCOOP-IX interface description basically consists of the following information:

- Name, type and size of C variables
- Name, return value and signature of C functions
- File origin of the C elements

For more details, refer to [ASCET and SCOOP-IX](IIO_ASCET_SCOOPIX.md) and to the "SCOOP and SCOOP-IX" section of the INTECRIO User’s Guide.

If you configured the operating system in the OS editor, the SCOOP-IX file (except version V1.0) also contains some OS information but none from the deactivated options (see [Project Preparation](IIO_ProjectPreparation.md#OS_deactivated)). However, this information is currently not used by INTECRIO.

The *.six file can be validated against the schema of the respective SCOOP-IX version with a validating XML parser, e.g. XML SPY 2007 SP1. The SCOOP-IX schema files are stored in the Formats\SCOOP-IX\<x>.<y>\Schemas subdirectories of your ASCET installation, <x>.<y> being the SCOOP-IX version number.

- <project name>.a2l

The ASAM-MCD-2MC file generated for working with INTECRIO.

A possible HWC module is not included in this file, either.

- <project name>.oil

This file contains the description of the operating system which can be used in INTECRIO.

Here, too, the HWC module is ignored because hardware configuration and OS configuration are done in INTECRIO.

This file is never imported automatically into INTECRIO. You either have to configure the operating system in INTECRIO manually or import the *.oil file manually. The format of this *.oil file does not correspond to the OSEK standard; it is an XML-based description of the operating system configuration.

- *.c and *.h

The C code and header files for the project and its different components. Exactly which *.c and *.h files are used by INTECRIO is contained in the following block of the *.six file:

<fileContainer complete="false">

<pathBase path="{{codeDir}}" />

<!-- model specific C files -->

... *.c- and *.h files ...

</fileContainer>

See also

[ASCET and SCOOP-IX](IIO_ASCET_SCOOPIX.md)

[Project Preparation](IIO_ProjectPreparation.md)
