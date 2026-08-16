# Handling Configurations

ASCET-SCM provides extended configuration handling functionality for storing dependencies between Subversion revisions of ASCET item export files.

##### Configuration File

ASCET configuration information is stored in files. These files are stored in the same folder as the export file of the applicable ASCET item. The name of this configuration file is

<ASCET item name>.scmconfiguration.amd

In this file, an xml based structure collects details about the configuration base item with all its referenced items and their revision / configuration revision. This file should not be changed manually. It is generated and analyzed by the different configuration handling menu commands included in the [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) section of the [ASCET-SCM Menu](SCM_ASCET-SCM_Menu.md).

##### Configuration Revision

Similar to revisions, the configuration revision information is shown in ASCET item lists in a format illustrated by the following example:

item <Rev 123 – Conf 11>

In the above example, the item content is stored as revision 123 in the repository, while its dependencies are contained in a configuration file that is stored as revision 11.

See also

[Creating a Configuration](SCM_Creating_a_Configuration.md)

[Checking out a Configuration](SCM_Checking_out_a_Configuration.md)

[Updating a Configuration](SCM_Updating_a_Configuration.md)

[Comparing Configuration Versions](SCM_Comparing_Configuration_Versions.md)

[Managing ASCET Folders](SCM_Managing_ASCET_Folders.md)
