# INTECRIO Connectivity - Overview

Since V6.3, ASCET contains everything required for a successful linking of ASCET models in INTECRIO for integration and rapid prototyping:

- Selection of a rapid prototyping target (i.e. Prototyping, ES1130, ES1135, ES910 and RTPRO-PC) in the ASCET project editor.
- Provision of a special code generation for INTECRIO in which all required files (C code, ASAM-MCD-2MC file, SCOOP-IX description file) are created.

For that purpose, GNU and QCC compilers are provided.

- If the ASCET code generation for INTECRIO is used, automatic import of the project in INTECRIO.
- Adjusting the handling of non-resolved global variables and messages to the needs of INTECRIO.
- Providing options for the migration of existing projects.
- Providing the option of performing the integration in an INTECRIO system directly from ASCET.
- Providing the option for back animation of an ASCET model during the experiment.

Back animation means that the model variables can be measured and calibrated directly from within the ASCET model.

After the ASCET installation, a sample database INTECRIO_Tutorial is located in the [main ASCET database directory](ComponentManagerEnglishUS.chm::/CM_PathsNode.htm). It is also available as Tutorial INTECRIO.* (* = .exp or *.axl) file in the export directory of your ASCET installation.

ASCET V6.4 supports INTECRIO V4.0 or higher.

See also

[Safety Information](IntroductionEnglishUS.chm::/int_safetyinformation.htm)

[Experimental Target Configuration](IIO_ExperimentalTargetConfiguration.md)

[Hints on Using INTECRIO Connectivity / ASCET-RP](IIO_Hints_INTECRIOconnectivity_ASCETRP.md)

[Hardware Systems](IIO_Hardware_Systems.md)

[INTECRIO Experiment](IIO_INTECRIOExperiment.md)

[ASCET-RP - Overview](INT_ASCETRPoverview.md)
