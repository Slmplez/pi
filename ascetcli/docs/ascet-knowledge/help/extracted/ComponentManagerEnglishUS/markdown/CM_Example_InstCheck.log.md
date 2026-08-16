# Example: InstCheck.log

The InstCheck.log file generated with Verify Installation contains the following sections:

- [a list of packages for the current product](#packages)
- [a list of ETAS products installed on your machine](#products)
- [the results of the installation verification](#Result)

The following code is an extract from an InstCheck.log file.

Checking installation for: 'ASCET\6.2'

Date: 31.10.2012

Time: 18:27:57

Product Path : c:\ETAS\ASCET6.2\

Data Path : d:\ETASData\ASCET6.2\

Shared Path : c:\ETAS\ASCET6.2\ETASShared10\

Additional info for the current system:

=======================================

Smalltalk packages for current product

--------------------------------------

FEP-z55_Licensing ("V1.0.35")

...

Products and add on products

----------------------------

ASCET\5.2 (V5.2.2)

...

ASCET\6.0 (V6.0.1)

...

ASCET\6.1 (V6.1.3)

...

ASCET\6.2 (V6.2.0-0109)

\ASCET-MD (V6.2.0-0109)

\ASCET-RP (V6.2.0-0109)

\ASCET-RP-VX1121 (V6.2.0-0109)

\ASCET-SCM (V6.2.0-0109)

\ASCET-SE (V6.2.0-0109)

\DeveloperInstallation (V6.2.0-0109)

...

Result from the file check for your product:

============================================

-------------------------------------------------------------------------------

1 File(s) missing in installation:

894656 - 30.06.2011/09:08:00 - C:\ETAS\ASCET6.2\Ascet.bmp

-------------------------------------------------------------------------------

31 File(s) different to installation:

31664 - 24.05.2012/13:40:32 - C:\ETAS\ASCET6.2\ETASInternalOptions.aod.xml

...

-------------------------------------------------------------------------------

3 File(s) not from installation:

0 - 31.10.2012/18:26:36 - c:\ETAS\ASCET6.2\Patchbox\Mn_dummyApp.app

877 - 19.11.2008/11:15:56 - c:\ETAS\ASCET6.2\Patchbox\Mn_dummyApp.txt

0 - 31.10.2012/18:27:13 - c:\ETAS\ASCET6.2\Toolbox\Mn_dummyToolbox.ic

-------------------------------------------------------------------------------

14291 File(s) matching with installation:

3456 - 09.01.2012/16:13:32 - C:\ETAS\ASCET6.2\.exe.config

...

See also

[Verifying the ASCET Installation](CM_VerifyASCETinstallation.md)
