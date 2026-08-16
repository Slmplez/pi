# Merged CHM Content

## Overview

_Source: `markdown/SCM_Overview.md`_

# Overview

ASCET-SCM is a Software Configuration Management solution designed specifically for ASCET.

Software development in ASCET typically involves different versions, i.e. stages of development, of software. To facilitate the handling of versions within the development environment, ASCET-SCM offers the possibility to connect with a number of popular software configuration management (SCM) tools.

ASCET-SCM is an add-on to ASCET-MD. Subversion is part of the ASCET-SCM delivery package.

See also

[ASCET-SCM Architecture](markdown/SCM_ASCET-SCM_Architecture.md)

[Fundamentals of Software Configuration Management](markdown/SCM_Fundamentals_of_Software_Configuration_Management.md)

[Software Version Management Systems](markdown/SCM_Software_Version_Management_Systems.md)

[Version Handling Based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)

[Version Handling Based on MSSCCI](markdown/SCM_Version_Handling_based_on_MSSCCI.md)

[Configurations](markdown/SCM_Configurations.md)

[Results Dialog Box](markdown/SCM_Result_Dialog_Box.md)

[ASCET-SCM Scripting Interface](markdown/SCM_ASCET-SCM_Scripting_Interface.md)

[FAQs](markdown/SCM_FAQs.md)


---

## Fundamentals of Software Configuration Management

_Source: `markdown/SCM_Fundamentals_of_Software_Configuration_Management.md`_

# Fundamentals of Software Configuration Management

A major challenge in producing software for automotive use is to keep control of its contents and changes over a long period of time. Also, information exchange between different parties needs to be ensured as in most projects a large number of people are involved in the development process. Due to the constraints imposed by time pressure, reusing as many parts of existing solutions as possible is critical to success. Last but not least, quality standards like ISO or CMMI stipulate that software development for automotive use complies to robust control mechanisms such as version management.

Software version management serves for:

- Storing all software sources in a central storage place ("repository").
- Keeping tracking of software development history by storing versions for each development step or any (major) change.
- Coordinating changes to software parts performed by multiple developers, enabling each developer to "lock" or "reserve" the part he/she is currently working on. This "lock" or "reserve" mechanism ensures that no two users change the same part at the same time.

Software [configuration](markdown/SCM_Configurations.md) management extends software version management by the following capabilities:

- Storing reproducible copies of complete deliverables, i.e. combinations of versions of software parts that belong to the same ECU project.
- Recovering previous delivery states (e.g. for maintenance or reuse in other projects).
- Discovering interdependencies between multiple deliverables (e.g. reused classes that occur in multiple ECU projects; changes in one project might affect other deliveries, too).

To provide these capabilities and to support the user in performing the associated tasks, an SCM tool has to offer interface for:

Managing access by multiple users from different places to the same server/repository.

- Retrieving defined versions of software parts, providing information for identifying development history.
- Reserving parts of the software for one user to make changes. ASCET-SCM uses the term "edition" for an item that is reserved by one user; the user can edit the contents of this item only in the "edition" state. Upon completion of these edits, the users will save a new status (version) of the edited software parts.
- Retrieving and saving combinations of software parts (i.e. saving their dependencies complete with detailed version status information) and enabling users to view details about these "configurations".

See also

[Software Version Management Systems](markdown/SCM_Software_Version_Management_Systems.md)


---

## Software Version Management Systems

_Source: `markdown/SCM_Software_Version_Management_Systems.md`_

# Software Version Management Systems

Software version control systems enable organizations to manage and efficiently handle multiple revisions of the same unit of information. Software version control systems generally help to ensure that

- multiple users can work on the same software project at the same time, with each user handling a "locked" (or "reserved") item or set of items that cannot be edited by other users while in the "locked" or "reserved" state.
- individual versions (i.e. stored "states") of an item are automatically labeled with a unique (and usually incremented) identification tag and can retrieved via this ID tag.
- a log, tracing the history (including all changes) of any item under version control, is automatically written.
- versions of an item are not inadvertently overwritten.

See also

[Fundamentals of Software Configuration Management](markdown/SCM_Fundamentals_of_Software_Configuration_Management.md)

[Version Handling Based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)

[Version Handling Based on MSSCCI](markdown/SCM_Version_Handling_based_on_MSSCCI.md)


---

## Version Handling based on Subversion

_Source: `markdown/SCM_Version_Handling_based_on_Subversion.md`_

# Version Handling Based on Subversion

Subversion is part of the ASCET-SCM delivery package.

Subversion is a software version control product offered by the open source community. With Subversion, any types of files can be stored in repositories. ASCET-SCM offers an interface to automatically store ASCET export files in local or network repositories defined by the user. In addition to the files themselves, additional version specific information can be stored, e.g. comments or user defined version attributes.

##### Subversion Interface of ASCET-SCM

The Subversion interface of ASCET-SCM is aimed at resembling the standard user interactions offered by Tortoise SVN. Therefore, the menu operations ASCET-SCM offers for Subversion are similar to those provided e.g. by Windows Explorer with Tortoise SVN installed. The Subversion interface of ASCET-SCM offers only a subset of user functions, e.g. no administrative actions like creating a new repository are implemented.

##### Multi-User Support

Subversion provides two mechanisms for handling file sharing:

- Lock-Modify-Unlock
- Copy-Modify-Merge

As no merging functionality exists for ASCET, the ASCET-SCM interface for Subversion uses the Lock-Modify-Unlock mechanism. This means that a controlled item can only be changed if locked by the user.

The Subversion menu operations for loading ASCET items ([Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout), [Update](markdown/SCM_ASCET-SCM_Menu.md#Update), …) result in these items being write-protected by default. Also, after you add a new item to the Subversion repository, or after you store a new revision, the item will be in write-protected state.

To make changes to ASCET items, you need to lock these items. Items that are currently locked by another user are marked as Rev_ExternLock. If you don't want an item change to result in a new revision (e.g. if you just want to try out something without storing the result), you can remove the write-protection by selecting Edit without Lock from the [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) submenu of the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

##### Overlay Icons

ASCET-SCM indicates the current state of an item or configuration through the applicable [overlay icon](markdown/SCM_Overlay_Icons.md).

For further information on Subversion, visit [http://subversion.apache.org/](http://subversion.apache.org/).

See also

[ASCET-SCM Architecture](markdown/SCM_ASCET-SCM_Architecture.md)

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Importing Data from the Subversion Repository](markdown/SCM_Importing_Data_from_the_Subversion_Repository.md)

[Special Use Case: Handling Imported Components](markdown/SCM_Special_Use_Case__Handling_Imported_Components.md)


---

## Version Handling based on MSSCCI

_Source: `markdown/SCM_Version_Handling_based_on_MSSCCI.md`_

# Version Handling Based on MSSCCI

MSSCCI is a de facto standard API designed by Microsoft which sets up a communication bridge between an IDE (e.g. ASCET, Visual Studio .Net …) and a corresponding SCM tool. It includes a variety of options that individual SCM providers can support.

A number of SCM tools for the Windows platform support the Microsoft Source Code Control Interface. SCM tools are associated with MSSCCI implementations include the following:

- Visual Source Safe (VSS)
- ClearCase (CC)
- Perforce P4V
- MKS Source Integrity
- Starbase
- SurroundSCM
- CVS
- PVCS

See also

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## Configurations

_Source: `markdown/SCM_Configurations.md`_

# Configurations

Configurations are sets of logically related components. ASCET-SCM enables you to store and retrieve such configuration under version control. Note that a configuration may contain elements at different revision levels; however, a configuration must not contain different revisions of the same element.

##### Multi-User Support for Configurations

Unlike ASCET item contents, configuration contents can always be changed. There is no write-protection mechanism in ASCET for configurations. You can change a configuration either by changing the base item of the configuration or by changing any referenced item.

Just like an item, you can lock a configuration in order to edit it. The methodology uses commands similar to those provided for items. However, even if you did not lock a configuration before committing a new revision, the commit will be executed; ASCET-SCM automatically locks the configuration prior to the commit. If the same configuration is locked by another user, the commit will fail and ASCET-SCM will issue an associated message.

If the same configuration or an included item is [locked](markdown/SCM_Locking_and_Unlocking.md) by another user, the [commit](markdown/SCM_Committing.md) will fail and ASCET-SCM will issue an associated message.

##### States of ASCET Configurations Controlled by means of Subversion

Similar to item revision states, configuration states are visualized by overlay icons in ASCET-SCM. The state icons for configurations are shown behind revision state icons and have the same meaning for configuration states as for revision states.

Example:

ASCET project "p1" is stored as revision 37, currently locked and modified in ASCET. A configuration of "p1" was also stored (last updated or committed in revision 39 which is not locked and might not be valid any more). This state is displayed within the ASCET database or workspace in the following way:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/icon_project.gif)

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)


---

## Simple Mode User Interface

_Source: `markdown/SCM_SimpleUI.md`_

# Simple Mode User Interface

ASCET-SCM uses a simplified user interface design.

It is used for basic operations in software configuration management such as adding, committing and updating content, providing a basic set of functionality. Furthermore, it enables keyboard operation.

This Simple Mode user interface is activated by default. It can be deactivated for the use of advanced functionality.

All instructions in this online help concerning the Simple Mode user interface are labeled with the supplement (Simple Mode).

See also

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)

[Keyboard Operation in Simple Mode User Interface](markdown/SCM_Keyboard_Operation_Simple_mode.md)


---

## Connection between ASCET and the Software Version Control System

_Source: `markdown/SCM_Connection_between_ASCET_and_the_Software_Version_Control_System.md`_

# Connection between ASCET and the Software Version Control System

Before you can bring ASCET items under revision control in Subversion, you need to connect the associated ASCET database or workspace to the applicable driver for Subversion as well as to an existing repository managed by Subversion.

See also

[Setting up an ASCET-Subversion Connection](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md)


---

## Importing Data from the Subversion Repository

_Source: `markdown/SCM_Importing_Data_from_the_Subversion_Repository.md`_

# Importing Data from the Subversion Repository

Data can be imported from the Subversion repository to the ASCET database or workspace in multiple ways:

- If the items you want to load are not yet available in the current ASCET database/workspace or if the name of the item to be loaded is unknown, you can browse the repository content via the [Checkout](markdown/SCM_Checkout_Dialog_Box.md) dialog box, which is displayed when you select [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout). This command loads components that are not yet loaded.
- If the items you want to load are already available in the ASCET database/workspace , but you want to import a different version, you can select the applicable item versions via the [Update](markdown/SCM_Update_Dialog_Box.md) dialog box, which is displayed when you select [Update](markdown/SCM_ASCET-SCM_Menu.md#Update).
- If you want to load the most recent version of an item that is already available in the ASCET database/workspace, simply use [Update to Latest Revision](markdown/SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision).

See also

[Checking out in ASCET-SCM versus Checking out in TortoiseSVN](markdown/SCM_Checking_out.md#Checking_out_in_ASCET_SCM_versus_Checking_out_in_TortoiseSVN)


---

## Online versus Offline Mode

_Source: `markdown/SCM_Online_versus_Offline_Mode.md`_

# Online versus Offline Mode

In offline mode (i.e. while you do not have access to the selected Subversion repository URL, e.g. during field tests), you will only find a reduced set of commands in the SCM menu. In this mode, the SCM menu operations [Show Log](markdown/SCM_ASCET-SCM_Menu.md#Show_Log) and [Properties](markdown/SCM_ASCET-SCM_Menu.md#Properties) show the history status that was read the last time a [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout), [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) or [Update To Latest Revision](markdown/SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision) operation was executed on the selected item.

See also

[Connection between ASCET and the Software Version Control System](markdown/SCM_Connection_between_ASCET_and_the_Software_Version_Control_System.md)

[Editing Items in Offline Mode](markdown/SCM_Editing_Items_in_Offline_Mode.md)


---

## Repository

_Source: `markdown/SCM_Repository.md`_

# Repository

The repository is the place where the files containing versions of items under version control are maintained. In some SCM tools, this is called "archive".

Note that, except for Subversion, ASCET-SCM does not provide functionality for creating a repository. The instructions provided for ASCET-SCM assume that this repository already exists. If you want to test a software prototype and you do not yet have a (Subversion) repository available for this purpose, create one in an empty folder by using a suitable tool.

ASCET-SCM only supports Subversion repositories in Subversion 1.4 format. An incompatibility between Subversion 1.4 and TortoiseSVN 1.5 (and higher) means that local SVN repositories created with TortoiseSVN 1.5 cannot be used by ASCET-SCM. See ASCET-SCM_Repository Tortoise SVN V1.5.pdf in the ToolsAndUtilities directory of your installation disk for details on creating a Subversion repository for ASCET-SCM.

For details about TortoiseSVN, refer to [http://tortoisesvn.net](http://tortoisesvn.net).

See also

[Selecting a Repository](markdown/SCM_Selecting_a_Repository.md)


---

## Checking out

_Source: `markdown/SCM_Checking_out.md`_

# Checking out

By checking out an item or configuration from the Subversion repository via the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) or Checkout Configuration (in the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu) command, you make it available for use (including editing) in your current ASCET session.

If you want to edit an item, be sure to lock it first by selecting [Get Lock](markdown/SCM_ASCET-SCM_Menu.md#Get_Lock) from the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

##### Checking out in ASCET-SCM versus Checking out in TortoiseSVN

The ASCET-SCM menu command [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) is NOT the same as the Checkout command in TortoiseSVN. The reason for the difference between ASCET-SCM and TortoiseSVN commands is that, in ASCET, all activities are based on items (ASCET components – not including folders), whereas in TortoiseSVN they are based on folders.

The Checkout command in ASCET-SCM does not automatically read a complete repository to a new folder, but shows the complete repository content in the Checkout Dialog Box. Via this dialog box, you can conveniently select the items you want to import to ASCET. By selecting the root folder in this dialog box, you can select all items in the repository with a single click.

See also

[Repository](markdown/SCM_Repository.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Committing](markdown/SCM_Committing.md)

[Checking out Items](markdown/SCM_Checking_out_Items.md)

[Checking out a Configuration](markdown/SCM_Checking_out_a_Configuration.md)


---

## Locking and Unlocking

_Source: `markdown/SCM_Locking_and_Unlocking.md`_

# Locking and Unlocking

By default, all items controlled in Subversion are write-protected within ASCET. If you want to edit an item, you need to lock it to ensure that it is exclusively reserved for you, implying that no other users can edit this item at the same time. In Subversion, the [Get Lock](markdown/SCM_ASCET-SCM_Menu.md#Get_Lock) command in the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md) enables you to switch selected items to the locked state.

- You can unlock an item (i.e. release the item for use by others) by means of the Release Lock command in the [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) submenu.
- For configurations, use the Get Lock for Configuration and Release Lock for Configuration commands in the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu, respectively.
- Once you have unlocked an item or configuration, it can be locked by other users and your local modifications may be thus be undone. That's why ASCET-SCM will issue a warning message when you unlock locally modified items or configurations. To preserve your modifications under version control, select Commit or Commit Configuration.
- Note that items are automatically taken out of the "locked" state when you select Commit.

See also

[Checking out Items](markdown/SCM_Checking_out_Items.md)

[Locking an Item](markdown/SCM_Locking_an_Item.md)

[Committing an Item](markdown/SCM_Committing_an_Item.md)


---

## Updating

_Source: `markdown/SCM_Updating.md`_

# Updating

If items are selected in ASCET that are already under version control in Subversion, the [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) command retrieves current data for these items from the Subversion repository. This functionality enables you to load a fresh version of these items from the repository. All items currently selected are listed in the [Update Dialog Box](markdown/SCM_Update_Dialog_Box.md). To make available all entries of the SCM repository, ASCET-SCM first updates the list of existing versions.

Optionally, you can use the [Update to Latest Revision](markdown/SCM_Update_to_Latest_DialogBox.md) command to retrieve the most recent date for the selected items from the Subversion repository. All applicable items are listed in the [Update to Latest Revision Dialog Box](markdown/SCM_Update_to_Latest_DialogBox.md).

##### Updating in ASCET-SCM versus Updating in TortoiseSVN

The ASCET-SCM menu command [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) is NOT the same as the Update command in TortoiseSVN. The reason for the difference between ASCET-SCM and TortoiseSVN commands is that, in ASCET, all activities are based on items (ASCET components – not including folders), whereas in TortoiseSVN they are based on folders.

The Update command in ASCET-SCM looks for existing revisions of selected ASCET items (or all locally existing items within a selected path). NO further items are searched for in the repository path if they do not yet exist yet in ASCET. To retrieve items that are not in the ASCET database or workspace, use [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout).

See also

[Repository](markdown/SCM_Repository.md)

[Updating Items](markdown/SCM_Updating_Items.md)

[Updating Items to Latest Revision](markdown/SCM_Update_to_LatestRevision.md)

[Updating a Configuration](markdown/SCM_Updating_a_Configuration.md)


---

## Committing

_Source: `markdown/SCM_Committing.md`_

# Committing

When you have completed your edits for an item, you can select [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) or [Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit) to take this item out of the "locked" state and to save the current state of this item in the repository. This is equivalent to "checking in" the item.

- Commit serves for storing a new version of an existing item (that is already under version control) in the Subversion repository.
- Add and Commit brings the selected item under version control and commits it to the Subversion repository in a single operation.

See also

[Committing an Item](markdown/SCM_Committing_an_Item.md)

[Committing a Configuration](markdown/SCM_Committing_a_Configuration.md)

[Repository](markdown/SCM_Repository.md)

[Checking out](markdown/SCM_Checking_out.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)


---

## Handling Configurations

_Source: `markdown/SCM_Handling_Configurations.md`_

# Handling Configurations

ASCET-SCM provides extended configuration handling functionality for storing dependencies between Subversion revisions of ASCET item export files.

##### Configuration File

ASCET configuration information is stored in files. These files are stored in the same folder as the export file of the applicable ASCET item. The name of this configuration file is

<ASCET item name>.scmconfiguration.amd

In this file, an xml based structure collects details about the configuration base item with all its referenced items and their revision / configuration revision. This file should not be changed manually. It is generated and analyzed by the different configuration handling menu commands included in the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) section of the [ASCET-SCM Menu](markdown/SCM_ASCET-SCM_Menu.md).

##### Configuration Revision

Similar to revisions, the configuration revision information is shown in ASCET item lists in a format illustrated by the following example:

item <Rev 123 – Conf 11>

In the above example, the item content is stored as revision 123 in the repository, while its dependencies are contained in a configuration file that is stored as revision 11.

See also

[Creating a Configuration](markdown/SCM_Creating_a_Configuration.md)

[Checking out a Configuration](markdown/SCM_Checking_out_a_Configuration.md)

[Updating a Configuration](markdown/SCM_Updating_a_Configuration.md)

[Comparing Configuration Versions](markdown/SCM_Comparing_Configuration_Versions.md)

[Managing ASCET Folders](markdown/SCM_Managing_ASCET_Folders.md)


---

## Managing ASCET Folders

_Source: `markdown/SCM_Managing_ASCET_Folders.md`_

# Managing ASCET Folders

In ASCET, folders cannot be managed as separate SCM entries. If you select a folder and start an operation, it will be executed on each item within the folder and subfolders. If a configuration is to be stored for items that do not reference each other, use a "container" item. Add all relevant items to that container and then store a configuration for the container item by selecting it and then selecting Add and Commit New Configuration from the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu of the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

You are recommended to use Add and Commit New Configuration for an individual configuration but not for a folder. If you apply this command at a folder level, each item within this folder will receive its own configuration.

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)


---

## Special Use Case: Handling Imported Components

_Source: `markdown/SCM_Special_Use_Case__Handling_Imported_Components.md`_

# Special Use Case: Handling Imported Components

ASCET-SCM enables you to import a new version of a component that is already under version control in the Subversion repository.

- If the existing version of the component is editable at the time of the import (i.e. if [Edit without Lock](markdown/SCM_Editing_Items_in_Offline_Mode.md) or [Get Lock](markdown/SCM_Locking_an_Item.md) was performed on the component prior to the import), the newly imported content overwrites the existing content of the component, and the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24.gif)icon marks the component as modified. You can then apply [Commit](markdown/SCM_Committing_an_Item.md) or [Commit New Revision without Lock](markdown/SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.
- If the existing version of the component is not editable at the time of the import, the newly imported content overwrites the existing content of the component, and the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image34.gif)icon marks the component as invalid. You can then apply [Commit New Revision without Lock](markdown/SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.

##### What Happens to the OID when a New Version of a Component is Imported?

Each ASCET component is uniquely identified through its OID. This OID is used in the following ways:

- Internally, ASCET uses this OID to identify dependencies between components. Components reference each other by OID rather than by component name.
- The OID is included in the code generated for experimental targets.
- Some software version management systems as well as customer processes may use the OID for component identification.

When you use ASCET-SCM, this OID may be overwritten by another OID in the following cases:

- You import an binary or XML file that includes a component with its own OID and the ASCET database or workspace already contains a component that has the same path and name.
- You import an XML file describing a component (even if the same component has previously been exported) and the Remap OIDs option is set, generating new unique OIDs.
- ASCET handles these model changes just like any other modifications. Consequently, the freshly imported component will be marked invalid or modified as described above.

See also

[Handling Imported Components](markdown/SCM_Handling_Imported_Components.md)

[Overlay icons](markdown/SCM_Overlay_Icons.md)


---

## Conflicts

_Source: `markdown/SCM_Conflicts.md`_

# Conflicts

If an ASCET-SCM operation runs into a conflict with the content of the current ASCET database or workspace, the [Conflicts Found Dialog Box](markdown/SCM_Conflicts_Found_Dialog_Box.md) is displayed, providing more detailed information about the conflict.

In ASCET-SCM, there are two kinds of conflicts:

- critical conflicts (import not possible) and
- overwrite existing items (intentional or accidental).

Critical conflicts are always shown by the application (also for [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) or [Update to Latest](markdown/SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision)). The conflicting items are automatically ignored in further actions. Critical conflicts occur if an item to be loaded conflicts with an item in ASCET database/workspace that has the same name and is stored in the same folder but has a different Object ID (OID).

Conflicts that cause existing items to be overwritten in the ASCET database/workspace are only shown if the [Warn of Conflicts](markdown/SCM_Appearance_Options_for_ASCET-SCM.md#Warn_of_Conflicts) option is checked in the [Appearance Options for ASCET-SCM](markdown/SCM_Appearance_Options_for_ASCET-SCM.md) page of the Tool Options dialog box in ASCET-SCM. For each conflicting item the version to be loaded is shown as well as the local version currently loaded in ASCET.

The Local Modifications Detected message indicates actions that overwrite the local status of items which have already been modified in edit mode.

See also

[Conflicts Found Dialog Box](markdown/SCM_Conflicts_Found_Dialog_Box.md)


---

## ASCET-SCM Architecture

_Source: `markdown/SCM_ASCET-SCM_Architecture.md`_

# ASCET-SCM Architecture

As there are multiple tools on the market which differ in their interfaces as well as in the way they handle software versioning, ASCET-SCM is made up of different layers.

- Part of ASCET-SCM is directly integrated in the ASCET base package. This involves additional data needed for ASCET items if these are managed by SCM tools.
- To handle all activities between ASCET and SCM tools, a separate ASCET-SCM server application runs in parallel to ASCET.
- Any SCM tool specific actions are encapsulated in separate packages (called "drivers") which are loaded by the ASCET-SCM server for the corresponding SCM tool that is used in the current ASCET database or workspace.
- Each driver connects to APIs of specific SCM tools, e.g. SVN Driver connects to the command line interface offered by Subversion.

See also

[Fundamentals of Software Configuration Management](markdown/SCM_Fundamentals_of_Software_Configuration_Management.md)

[Software Version Management Systems](markdown/SCM_Software_Version_Management_Systems.md)


---

## ASCET-SCM Scripting Interface

_Source: `markdown/SCM_ASCET-SCM_Scripting_Interface.md`_

# ASCET-SCM Scripting Interface

In addition to the commands provided via the [ASCET-SCM Menu](markdown/SCM_ASCET-SCM_Menu.md), ASCET-SCM provides a scripting interface. Each ASCET-SCM command that can be executed automatically (i.e. without user input) is available as an ASCET API method.

- As the first step, your script always has to use the GetSCMInterface() method to retrieve an SCM-API object.
- Following the successful completion of this step, the script can call one of the methods described below.

For details on how to use the ASCET API, refer to the ASCET API documentation.

##### String ExecuteSCMCommand(string command, string data, string options);

This is the key function of the scripting interface. To call an SCM method via the ASCET API, use the above syntax, where the <command> parameter expects the following strings, depending on the operation to be executed.

| Column 1 | Column 2 |
| --- | --- |
| Menu Command (SVN Driver) | Corresponding API Method for SVN Driver |
| Checkout | Checkout (Note: If the data parameter is not defined, all items found in the repository will be checked out!) |
| Update | Update |
| Update to Latest Version | UpdateToLatest |
| Add and Commit | Add |
| Commit | Commit |
| Show Log | ShowLog |
| Check for Modifications | CheckForUpdates |
| Delete (in Additional Commands submenu) | Delete |

The <data> parameter expects a defined XML structure containing all information of the items to be handled. This structure can be collected by means of the ASCET API method GetItemSCMData.

The options parameter is not used at present.

##### String GetItemSCMData(DataBaseItem[] itemList)

Gets a list of ASCET component objects and returns an XML string containing the SCM data (which can then be used for other methods such as [ExecuteSCMCommand](#ExecuteSCMCommand).

##### String GetLastError()

Returns an error description if the most recent operation encountered an error.

##### String GetSourceControlBindingInformation()

Returns an XML string describing the setting of the current database or workspace. This XML string can be used to feed InitializeSourceControl() in order to configure an new database using ASCET-SCM.

##### String InitializeSourceControl(String bindingInformation)

Initiates the process of configuring a new database in ASCET-SCM by assigning version control information to the database or workspace.

##### String RemoveSourceControl()

Removes the version control information from the database and from all components contained in this database or workspace.

See also

[Important Note: Using ASCET-SCM with the Tool API](markdown/SCM_ImportantNote_UseSCMwithToolAPI.md)

[C# Example](markdown/SCM_CExample.md)


---

## Important Note: Using ASCET-SCM with the Tool API

_Source: `markdown/SCM_ImportantNote_UseSCMwithToolAPI.md`_

# Important Note: Using ASCET-SCM with the Tool API

The ToolAPI is not aware of ASCET-SCM and does not notify ASCET-SCM about changes in the same way as the GUI of ASCET does. Therefore it is in the responsibility of the developer of a ToolAPI client application to ensure that the constraints which are introduced by ASCET-SCM are not violated.

The following methods will support the ASCET-SCM constraints:

- Component.IsVersion()
- Component.IsEdition()
- AscetSCMInterface.SetItemToSCMModified(DataBaseItem item)

Ascet tool = new Ascet();

AscetSCMInterface scm = tool.GetSCMInterface();

AscetDataBase db = tool.GetCurrentDataBase();

DataBaseItem dbItem = db.GetItemInFolder("Class_Block_Diagram", @"Root_1");

if ((dbItem != null) && (dbItem.IsComponent()))

{

Component myComponent = (Component)dbItem;

Component[] myComponents = { myComponent };

// Do never modify a versioned component

if (myComponent.IsVersion())

// Prepare SCM for the upcoming modifications by getting the lock

scm.ExecuteSCMCommand("Lock", scm.GetItemSCMData(myComponents), "");

// Is component modifiable now

if (myComponent.IsEdition())

{

// Perform the modification of the component

myComponent.SetComment(DateTime.Now.ToString());

// Inform SCM about the modification

scm.SetItemToSCMModified(myComponent);

// Force SCM to commit the modified component

scm.ExecuteSCMCommand("Commit", scm.GetItemSCMData(myComponents), "");

}

}

tool.DisconnectFromTool();

See also

[ASCET-SCM Scripting Interface](markdown/SCM_ASCET-SCM_Scripting_Interface.md)

[C# Example](markdown/SCM_CExample.md)


---

## C# Example

_Source: `markdown/SCM_CExample.md`_

# C# Example

using de.etas.cebra.toolAPI.Ascet;

namespace APITest

{

class Program

{

static void Main()

{

Ascet tool = new Ascet();

AscetDataBase myDataBase = tool.OpenDataBase("newDatabase");

AscetFolder myFolder = myDataBase.GetAscetFolder("newFolder");

if (myFolder != null)

{

myDataBase.Remove(myFolder, true);

}

myFolder = myDataBase.AddAscetFolder("newFolder");

AscetModule myModule = myFolder.AddModule("newModule", "BDE");

tool.DisconnectFromTool();

}

}

}

See also

[ASCET-SCM Scripting Interface](markdown/SCM_ASCET-SCM_Scripting_Interface.md)

[Important Note: Using ASCET-SCM with the Tool API](markdown/SCM_ImportantNote_UseSCMwithToolAPI.md)


---

## Setting up Subversion for Use with ASCET-SCM

_Source: `markdown/SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md`_

# Setting up Subversion for Use with ASCET-SCM

You can set up:

1. [Tool options for ASCET-SCM](markdown/SCM_Tool_Options_for_ASCET-SCM.md).
1. [An ASCET-Subversion connection](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md).
1. [Appearance options for ASCET-SCM](markdown/SCM_Appearance_Options_for_ASCET-SCM.md).


---

## Setting up an ASCET-Subversion Connection

_Source: `markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md`_

# Setting up an ASCET-Subversion Connection

Proceed as follows to connect the ASCET database or workspace to Subversion:

1. In the [SCM](markdown/SCM_Menu_withoutVersionManagement.md) menu, select [Configure Source Control](markdown/SCM_Menu_withoutVersionManagement.md#Configure_Source_Control).
1. In this dialog box, select the driver for the SCM tool you want to use. For instance, select the Subversion driver.
1. Click Configure Selection.
1. Enter or select the appropriate settings in this dialog box. For instance, select or enter the path name of an existing [Repository](markdown/SCM_Repository.md). Then click OK to return to the Driver Selection Dialog Box.
1. In this dialog box, click OK to apply your settings and to establish the connection between ASCET and Subversion.

Following this step, the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu contains the full range of all operations possible for the ASCET-Subversion connection. The repository path is [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)displayed](javascript:void(0);) next to the database/workspace name in the 1 Database / 1 Workspace list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/RepositoryPath.gif)

To change the repository and working copy path later, the current source control bindings have to be removed first.

See also

[Connection between ASCET and the Software Version Control System](markdown/SCM_Connection_between_ASCET_and_the_Software_Version_Control_System.md)

[Selecting a Repository](markdown/SCM_Selecting_a_Repository.md)

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)


---

## Selecting a Repository

_Source: `markdown/SCM_Selecting_a_Repository.md`_

# Selecting a Repository

Proceed as follows to select a software version control repository for use with your ASCET data:

1. In the [SCM Menu](markdown/SCM_ASCET-SCM_Menu.md), open the [Source Control](markdown/SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) submenu and select Show Source Control Settings.
1. In this dialog box, click on the magnifying glass icon to the right of the [Repository URL](markdown/SCM_Subversion_Settings_Dialog_Box.md#Repository_URL) edit field.
1. Use this browser to select the URL of the repository you want to use with your ASCET data.
1. When you have selected the URL, you may want to test the connection to this URL by pressing the [Test Connection](markdown/SCM_Subversion_Settings_Dialog_Box.md#Test_Connection) button in the [Subversion Settings Dialog Box](markdown/SCM_Subversion_Settings_Dialog_Box.md).
1. Optionally, when you place items under version control via [Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit), you can [select or create repository folders](markdown/SCM_Selecting_or_Creating_a_Repository_Folder_for_an_Item.md) for these items.

For the sake of performance, please select the URL of a repository that does not contain a large amount of other data (e.g. use a subfolder for ASCET-SCM if necessary). Depending on the size of the repository, [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) operations might take a long time.

If TortoiseSVN is installed on the system, a button behind the [Repository URL](markdown/SCM_Subversion_Settings_Dialog_Box.md#Repository_URL) edit field is enabled which opens TortoiseSVN "Repo-Browse" with the currently selected URL. If you select another URL in the Repository Browser, it can be entered as the ASCET-SCM Repository URL via the standard copy & paste mechanism.

To select a new repository and choose a different working copy path as described above, the current source control bindings have to be removed first.

See also

[Repository](markdown/SCM_Repository.md)

[Subversion Settings Dialog Box](markdown/SCM_Subversion_Settings_Dialog_Box.md)

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)


---

## Customizing Menus and Icons

_Source: `markdown/SCM_CustomizingMenusIcons.md`_

# Customizing Menus and Icons

In the driver-specific XML file (e.g., SubversionDriver.xml in the <ASCET installation directory>\SCM\Drivers\ETAS.Subversion directory), you can customize the SCM menu and toolbar.

- The <Command ... /> entries define the available commands.
- The sections <MenuDefinitions>...</MenuDefinitions> and <MenuDefinitions state="Offline">...</MenuDefinitions> contain menu and toolbar definitions for [online and offline mode](markdown/SCM_Online_versus_Offline_Mode.md).
- The sections <ASCETMenuBar>...</ASCETMenuBar>, <ASCETToolBar>...</ASCETToolBar> and <ASCETContextMenu>...</ASCETContextMenu> define parts of the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), the [toolbar](markdown/SCM_Toolbar_Icons.md) and parts of the Source Control context menu.

Proceed as follows.

1. Open the XML file in a suitable editor.
1. [Edit the <Command ... /> entries.](javascript:void(0);)
1. [Edit the SCM menu in the <ASCETMenuBar>...</ASCETMenuBar> section.](javascript:void(0);)
1. [Edit the SCM toolbar in the <ASCETToolBar>...</ASCETToolBar> section.](javascript:void(0);)
1. [Edit the Source Control context menu in the <ASCETContextMenu>...</ASCETContextMenu> section.](javascript:void(0);)

See also

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)

[SCM Menu (with Version Management)](markdown/SCM_ASCET-SCM_Menu.md)

[Toolbar Icons](markdown/SCM_Toolbar_Icons.md)


---

## Customizing Menus and Icons - Examples

_Source: `markdown/SCM_CustomizeMenusIcons_Examples.md`_

# Customizing Menus and Icons - Examples

This topic contains some examples for menu and toolbar configuration:

1. [Example 1: Editing a <Command ... /> entry](#Example1)
1. [Example 2: Adding a command to the SCM menu](#Example2)
1. [Example 3: Shifting menu items to a submenu](#Example3)
1. [Example 4: Adding a command to the SCM toolbar](#Example4)

##### Example 1: Editing a <Command ... /> entry

The following <Command .../> entry is required to rename the Get Lock command to Get Lock for Item and replace the default icon with the [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)green-upper-L.ico file](javascript:void(0);) in the C:\ETAS\ASCET6.2\SCM\common_icons folder.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_1.gif)

<Command internalID="11" id="Lock" label="Get Lock for Item" iconID="..\..\..\common_icons\green-upper-L" considerItemSelection="true" validItemVersionStates="revision,modified,no_scm" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

With that definition, the entries in the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md) and the [SCM toolbar](markdown/SCM_Toolbar_Icons.md) look as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_2.gif)

[Back to top](#)

##### Example 2: Adding a command to the SCM menu

The Checkout and Lock Configuration command is defined in the following <Command .../> entry:

<Command internalID="35" id="CheckoutAndLockConfiguration" label="Checkout and Lock Configuration" iconID="menu_checkout_and_lock_config" considerItemSelection="true" validItemVersionStates="configuration.revision" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

The following code adds the standard definition of the Checkout and Lock Configuration command to the Configuration Management submenu of the [SCM menu (online mode)](markdown/SCM_ASCET-SCM_Menu.md):

<MenuDefinitions>

<ASCETMenuBar>

...

<MenuItem label="Configuration Management">

...

<MenuItem id="CheckoutAndLockConfiguration"/>

...

</MenuItem>

...

</ASCETMenuBar>

...

</MenuDefinitions>

With that, the Configuration Management submenu of the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md) can look as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_3.gif)

[Back to top](#)

##### Example 3: Shifting menu items to a submenu

The [Source Control](markdown/SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) context menu (online mode) contains, by default, the same Configuration Management submenu as the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu (online mode). The following code is required to place the last four commands of that submenu in a lower-level submenu named Advanced.

<MenuDefinitions>

...

<ASCETContextMenu>

...

<MenuItem label="Configuration Management">

...

<MenuItem label="Advanced"/>

<MenuItem id="ShowConfigurationLog"/>

<MenuItem id="ConfigurationProperties"/>

<MenuItem id="CompareConfiguration"/>

<MenuItem id="VerifyConfiguration"/>

</MenuItem>

</MenuItem>

...

</ASCETContextMenu>

</MenuDefinitions>

With that, the Configuration Management submenu of the [Source Control](markdown/SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) context menu looks as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_4.gif)

[Back to top](#)

##### Example 4: Adding a command to the SCM toolbar

The default definition of the Edit Without Lock command (used to [edit items in offline mode](markdown/SCM_Editing_Items_in_Offline_Mode.md)) looks as follows:

<Command internalID="16" id="EditWithoutLock" label="Edit Without Lock" iconID="menu_commit_without_lock" considerItemSelection="true" invalidItemVersionStates="no_scm,lockedrevision,localedition,modified" validItemVersionStates="" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

The following code adds the Edit Without Lock command to the [SCM toolbar](markdown/SCM_Toolbar_Icons.md):

<MenuDefinitions>

...

<ASCETToolBar>

...

<MenuItem id="EditWithoutLock"/>

...

</ASCETToolBar>

...

</MenuDefinitions>

With that, the [SCM toolbar](markdown/SCM_Toolbar_Icons.md) can look as follows.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_6.gif)

[Back to top](#)

See also

[SCM Menu (with Version Management)](markdown/SCM_ASCET-SCM_Menu.md)

[Toolbar Icons](markdown/SCM_Toolbar_Icons.md)


---

## Activating/Deactivating the Simple Mode User Interface

_Source: `markdown/SCM_Activating_Deactivating_SimpleMode.md`_

# Activating/Deactivating the Simple Mode User Interface

For using advanced functionality of ASCET-SCM you may want to deactivate the Simple Mode user interface.

Proceed as follows to deactivate:

1. In the Tools menu, select Options.
1. In the tree view of the dialog box, select Integration > Source Control > Appearance.
1. Uncheck the checkbox button Use Simple Mode UIs.

The Simple Mode user interface is deactived.

See also

[Simple Mode User Interface](markdown/SCM_SimpleUI.md)


---

## Keyboard Operation in Simple Mode User Interface

_Source: `markdown/SCM_Keyboard_Operation_Simple_mode.md`_

# Keyboard Operation in Simple Mode User Interface

When using ASCET-SCM in Simple Mode, keyboard operation for dialogs is enabled. You can navigate through tables, fields and buttons of a dialog using Tab or directly jump to a certain element with the help of a shortcut.

In this online-help, shortcuts are listed in the reference of the dialogs.

The standard shortcut operation is:

| Column 1 | Column 2 |
| --- | --- |
| Tab | Jump to next element in the dialog. |
| Shift + Tab | Jump to previous element in the dialog. |
| Alt + Letter | Jump a certain element with a letter as shortcut. |
| Ctrl + Shift + Letter | Operate a button with a letter as shortcut. |

See also

[Simple Mode User Interface](markdown/SCM_SimpleUI.md)


---

## Typical Workflow - Using Subversion for Revision Control

_Source: `markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md`_

# Typical Workflow - Using Subversion for Revision Control

Use the following general procedure when using Subversion for software version control:

- Setting up the Software Version Control System for use with ASCET:

Check the ASCET database or workspace for SCM compatibility

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Set up an ASCET - Subversion Connection

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Select an existing repository

- Handling items:

Check out items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Lock items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Edit items in ASCET-MD and/or update items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Commit your changes

- For items that still need to be brought under version control, the typical "handling items" part of the workflow comprises the following steps:

Add and commit items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Check out items for editing

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Lock items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Edit items in ASCET-MD and/or update items

![](ms-its:ASCET_SCMEnglishUS.chm::/images/baby_down.jpg)

Commit your changes

See also

[Using Subversion for Revision Control](#)

[Setting up an ASCET-Subversion Connection](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md)

[Selecting a Repository](markdown/SCM_Selecting_a_Repository.md)

[Checking out Items](markdown/SCM_Checking_out_Items.md)

[Locking an Item](markdown/SCM_Locking_an_Item.md)

[Unlocking an Item](markdown/SCM_Unlocking_an_Item.md)

[Committing an Item](markdown/SCM_Committing_an_Item.md)

[Adding and Committing an Item](markdown/SCM_Add_and_Commit_Dialog_Box.md)

[Handling Configurations](markdown/SCM_Handling_Configurations.md)


---

## Checking Out Items (Simple Mode)

_Source: `markdown/SCM_Checking_out_Items_Simple_Mode.md`_

# Checking Out Items (Simple Mode)

To check out items from the repository in ASCET (Simple Mode):

1. In the SCM menu, select Checkout ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image15.gif).
1. Select an item from the Repository Content.
1. Repeat the previous step if you want to add additional revisions to the Selected Revision table for checkout.
1. Click the Checkout button to start the checkout.

If an item you checked out was committed with a different version, the item is marked as modified (e.g., ![](ms-its:ASCET_SCMEnglishUS.chm::/images/item_modified.gif)). Note that you still need to [lock](markdown/SCM_Locking_an_Item.md) the items you checked out before you can edit and/or commit them.

See also

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Checking out](markdown/SCM_Checking_out.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Checking out Items (Advanced Mode)

_Source: `markdown/SCM_Checking_out_Items.md`_

# Checking out Items (Advanced Mode)

When you have set up an ASCET-Subversion connection and selected a repository, you can proceed as follows to check out items in ASCET :

1. In the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), select [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout).
1. In the Repository Content pane on the Step 1 of 4 page, select the items you want to check out.
1. Click the >> button to copy the selected items to the Selected Elements pane.
1. Click Next to display the Step 2 of 4 page.
1. To check out a particular version of an item, proceed as follows.
1. Click the Checkout button to start the checkout.
1. If you want to view further details on the result of this operation for a given item, double-click on an item on the Step 4 of 4 page to display the [Detailed Result Information dialog box](markdown/SCM_Detailed_Result_Information_Dialog_Box.md).
1. Click Close to complete the checkout operation.

See also

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Checking out](markdown/SCM_Checking_out.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Locking an Item

_Source: `markdown/SCM_Locking_an_Item.md`_

# Locking an Item

Proceed as follows to lock an item:

1. In the ASCET component manager, select the items you want to lock.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, select Get Lock.
1. Close the Lock: Results dialog box.

Note that the item will be unlocked automatically when you [commit](markdown/SCM_Committing_an_Item.md) the item. Alternatively, you can [unlock](markdown/SCM_Unlocking_an_Item.md) the item manually.

See also

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Committing an Item](markdown/SCM_Committing_an_Item.md)

[Unlocking an Item](markdown/SCM_Unlocking_an_Item.md)

[Result Dialog Box](markdown/SCM_Result_Dialog_Box.md)


---

## Unlocking an Item

_Source: `markdown/SCM_Unlocking_an_Item.md`_

# Unlocking an Item

Note that any locked item will be unlocked automatically when you [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) the item.

Proceed as follows to unlock an item manually:

1. In the ASCET component manager, select the currently locked items you want to unlock.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Release Lock.
1. Close the Unlock: Results dialog box.

See also

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Locking an Item](markdown/SCM_Locking_an_Item.md)

[Results Dialog Box](markdown/SCM_Result_Dialog_Box.md)


---

## Updating Items (Simple Mode)

_Source: `markdown/SCM_Updating_Items_Simple_Mode.md`_

# Updating Items (Simple Mode)

To update items to a revision number:

1. In the ASCET component manager, select the items you want to update.
1. In the SCM menu, select Update ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image4.gif).
1. Modify the selection when necessary.
1. Repeat the previous step with different items when necessary.
1. Click the Update button to start the update.

If you select a folder, the Update command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command.

See also

[Updating](markdown/SCM_Updating.md)

[Updating Items to Latest Revision](markdown/SCM_Update_to_LatestRevision.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Items (Advanced Mode)

_Source: `markdown/SCM_Updating_Items.md`_

# Updating Items

Proceed as follows to update items to a selected revision number:

1. In the ASCET component manager, select the items you want to update.
1. In the SCM menu, select Update.
1. Use the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select.gif) buttons to refine your selection.
1. To select a revision for a single item, do the following:
1. To select a revision for multiple items, do the following:
1. In the Update dialog box, click Update to start the procedure.

If an item you selected for updating has been changed in your current ASCET session, the Local Modifications Detected box warns you that the update will undo these changes. Do one of the following:

- Click Yes to continue the update and discard the changes.
- Click No to cancel the entire update.

The items are updated, each to the selected revision.

If you select a folder, the Update command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command.

See also

[Updating](markdown/SCM_Updating.md)

[Updating Items to Latest Revision](markdown/SCM_Update_to_LatestRevision.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Items to Latest Revision (Simple Mode)

_Source: `markdown/SCM_Updating_Items_to_Latest_Revision_Simple_Mode.md`_

# Updating Items to Latest Revision (Simple Mode)

To update items to the latest revision number:

1. In the ASCET component manager, select the items you want to update.
1. In the SCM menu, select Update to Latest Revision ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image16.gif).
1. Modify the selection when necessary.
1. Repeat the previous step with different items when necessary.
1. Click the Update to Latest button to start the update.

If you select a folder in ASCET, the Update to Latest Revision command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command.

See also

[Updating](markdown/SCM_Updating.md)

[Updating Items (Simple Mode)](markdown/SCM_Updating_Items_Simple_Mode.md)

[Update to Latest Revision Dialog Box (Simple Mode)](markdown/SCM_Update_to_Latest_Dialog_Box_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Items to Latest Revision (Advanced Mode)

_Source: `markdown/SCM_Update_to_LatestRevision.md`_

# Updating Items to Latest Revision

Proceed as follows to update items to the latest revision number:

1. In the ASCET component manager, select the items you want to update.
1. In the SCM menu, select Update to Latest Revision.
1. Close the Update to Latest dialog box.

If you select a folder in ASCET, the Update to Latest Revision command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command.

See also

[Updating](markdown/SCM_Updating.md)

[Updating Items (Advanced Mode)](markdown/SCM_Updating_Items.md)

[Update to Latest Revision Dialog Box (Advanced Mode)](markdown/SCM_Update_to_Latest_DialogBox.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Committing an Item

_Source: `markdown/SCM_Committing_an_Item.md`_

# Committing an Item

When you are done editing an item that is already under version control, proceed as follows to commit (i.e. to check in) the item by storing its current status as a new version in the Subversion repository:

1. In the ASCET component manager, select the item you want to commit.
1. Select [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) from the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.
1. Use this dialog box to commit the item(s).

If the item was locked, its icon now includes an open padlock, indicating that the item is no longer locked.

If an item is not yet under version control, [Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit) enables you to bring this item under version control and to commit it to the Subversion repository in a single operation.

See also

[Typical Workflow - Using Subversion for Revision Control](markdown/SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Committing](markdown/SCM_Committing.md)

[Adding and Committing an Item (Simple Mode)](markdown/SCM_Adding_and_Committing_an_Item_Simple_Mode.md)

[Commit Dialog Box (Simple Mode)](markdown/SCM_Commit_Dialog_Box_Simple_Mode.md)

[Adding and Committing an Item (Advanced Mode)](markdown/SCM_Adding_and_Committing_an_Item.md)

[Commit Dialog Box (Advanced Mode)](markdown/SCM_Commit_Dialog_Box.md)


---

## Adding and Committing an Item (Simple Mode)

_Source: `markdown/SCM_Adding_and_Committing_an_Item_Simple_Mode.md`_

# Adding and Committing an Item (Simple Mode)

In most organizations, software under development is brought under centralized control by an administrator who takes care of [repository](markdown/SCM_Repository.md) management. The following instructions are primarily intended for users who want to add local items to the Subversion repository.

To bring items under version control:

1. In the ASCET component manager, select the items you want to add and commit.
1. In the SCM menu, select Add and Commit ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image7.gif).
1. Click the Add and Commit button to add the items to the repository.

See also

[Committing an Item](markdown/SCM_Committing_an_Item.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Adding and Committing an Item (Advanced Mode)

_Source: `markdown/SCM_Adding_and_Committing_an_Item.md`_

# Adding and Committing an Item

In most organizations, software under development is brought under centralized control by an administrator who takes care of [repository](markdown/SCM_Repository.md) management. The following instructions are primarily intended for users who want to add local items to the Subversion repository.

Proceed as follows to bring items under version control:

1. In the ASCET component manager, select the item(s) you want to commit.
1. Select [Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit) from the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.
1. Click Finish to complete the operation.

The Step 2 of 2 page of the Add and Commit dialog box displays the result of this operation. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

See also

[Committing an Item](markdown/SCM_Committing_an_Item.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Editing Items in Offline Mode

_Source: `markdown/SCM_Editing_Items_in_Offline_Mode.md`_

# Editing Items in Offline Mode

Proceed as follows to edit items in offline mode (i.e. while you do not have access to the selected Subversion repository URL, e.g. during field tests):

1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, select Edit without Lock.
1. Edit the selected items.
1. When the Subversion repository URL (i.e. the server on which the Subversion repository runs) is available to you again, select [Connect to Repository](markdown/SCM_ASCET-SCM_Menu.md#Connect_to_Repository1).
1. Then open the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Commit New Revision without Lock.

See also

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Handling Imported Components

_Source: `markdown/SCM_Handling_Imported_Components.md`_

# Handling Imported Components

If you use File, Import to import a version of a component (item or configuration) and an older version of the same component is already included in the Subversion repository, proceed as follows:

1. In the ASCET component manager, select the imported item or configuration.
1. If the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24.gif)icon marks the component as modified, select [Commit](markdown/SCM_Committing_an_Item.md) or [Commit New Revision without Lock](markdown/SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.
1. If the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image34.gif)icon marks the component as invalid, (i.e. the existing component was not editable at the time of the import), select [Commit New Revision without Lock](markdown/SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.

See also

[Version Handling Based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)

[Special Use Case: Handling Imported Components](markdown/SCM_Special_Use_Case__Handling_Imported_Components.md)

[What Happens to the OID when a New Version of a Component is Imported?](markdown/SCM_Special_Use_Case__Handling_Imported_Components.md#What_Happens_to_the_OID_when_a_New_Version_of_a_Component_is_Imported_)


---

## Deleting an Item from the Repository

_Source: `markdown/SCM_DeleteItemFromRepository.md`_

# Deleting an Item from the Repository

You can delete an item from the Subversion repository and the database/workspace at the same time.

Be careful: When you delete an item that is part of a configuration, the configuration file in the repository is not updated. Even if you delete all items of a configuration, the configuration file remains in the repository. You cannot load or check out such a configuration.

1. In the 1 Database or 1 Workspace list, select the items you want to delete.
1. Open the SCM menu, point to Additional Commands and select Delete.
1. Click Yes to continue the deletion.
1. Use the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select.gif) buttons to refine your selection.
1. Click Remove to perform the deletion.
1. Close the Remove: Results dialog box.

See also

[Remove Dialog Box](markdown/SCM_Delete_Dialog_Box.md)

[Results Dialog Box](markdown/SCM_Result_Dialog_Box.md)


---

## Creating a Configuration (Simple Mode)

_Source: `markdown/SCM_Creating_a_Configuration_Simple_Mode.md`_

# Creating a Configuration (Simple Mode)

If you need to store a new revision of an existing configuration, use [Commit Configuration](markdown/SCM_Committing_a_Configuration.md).

To create a new configuration:

1. In the ASCET component manager, select the base item you want to add a new configuration to.
1. In the SCM menu, point to Configuration Management and select Add and Commit New Configuration ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image31.gif).
1. Click the Add and Commit Configuration button to add a new configuration to the repository.

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Creating a Configuration (Advanced Mode)

_Source: `markdown/SCM_Creating_a_Configuration.md`_

# Creating a Configuration

If you need to store a new revision of an existing configuration, use [Commit Configuration (Advanced Mode)](markdown/SCM_Committing_a_Configuration.md).

Proceed as follows to create a new configuration:

1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Add and Commit Configuration.
1. In this dialog box, select just the "base" item in the reference structure you want to store as a configuration in the Subversion repository. ASCET-SCM automatically reads all necessary information of all referenced items for storing this configuration.
1. Click Commit to commit and save the configuration to the Subversion repository.

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Checking out a Configuration (Simple Mode)

_Source: `markdown/SCM_Checking_out_Configurations_Simple_Mode.md`_

# Checking Out a Configuration (Simple Mode)

The method for checking out a configuration is similar to the method for [checking out items](markdown/SCM_Checking_out_Items.md).

To check out an existing configuration from the repository (Simple Mode):

1. In the SCM menu, point to Configuration Management and select Checkout Configuration ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image21.gif).
1. Select an item containing a configuration from the Repository Content.
1. Repeat the previous step if you want to add additional configurations to the Selected Configurations table for checkout.
1. Click the Checkout button to start the checkout.

If an item you checked out was committed with a different version, the item is marked as modified (e.g., ![](ms-its:ASCET_SCMEnglishUS.chm::/images/item_modified.gif)). Note that you still need to [lock](markdown/SCM_Locking_an_Item.md) the items you checked out before you can edit and/or commit them.

See also

[Checking out](markdown/SCM_Checking_out.md)

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Checkout Configuration Dialog Box (Simple Mode)](markdown/SCM_Checkout_Configuration_Dialog_Box_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Checking out a Configuration (Advanced Mode)

_Source: `markdown/SCM_Checking_out_a_Configuration.md`_

# Checking out a Configuration

The method for checking out a configuration is similar to the method for [checking out items](markdown/SCM_Checking_out_Items.md). Proceed as follows to check out an existing configuration:

1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Checkout Configuration.
1. On the Step 1 of 5 page of this dialog box, you can enter search criteria to filter your selection.
1. In the Repository Content pane of the Step 1 of 5 page, select the configuration you want to check out. Then click the >> button to copy this configuration to the Selected Elements pane.
1. Click Next to display the Step 2 of 5 page.
1. If you want to activate a different revision, delete the one that is not ignored; the next item of the same ASCET OID will then be re-activated for import.
1. If you want to check out a different version of a configuration, right-click on this configuration and select Change Revision from the context menu to display the [Select Revision dialog box](markdown/SCM_Select_Revision_Dialog_Box.md) via which you can select the desired version number.
1. Click Next to display the Step 3 of 5 page.
1. Click the Checkout button to start the checkout.
1. If you want to view further details on the result of this operation for a given item, double-click on an item on the Step 5 of 5 page to display the [Detailed Result Information dialog box](markdown/SCM_Detailed_Result_Information_Dialog_Box.md).
1. Click Close to complete the checkout operation.

See also

[Checking out](markdown/SCM_Checking_out.md)

[Checkout Configuration Dialog Box (Advanced Mode)](markdown/SCM_Checkout_Configuration_Dialog_Box.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Loading a Configuration

_Source: `markdown/SCM_Loading_a_Configuration.md`_

# Loading a Configuration

Configurations stored in the Subversion repository can be loaded into the current ASCET database or workspace via the following commands of the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu:

- Checkout Configuration

or

- Update Configuration

Both of these operations load all referenced items in the applicable revision as listed in the configuration file.

- Update to Latest Configuration loads the most recent version of the configuration.

See also

[Checking out a Configuration](markdown/SCM_Checking_out_a_Configuration.md)

[Updating Configurations (Simple Mode)](markdown/SCM_Updating_Configurations_Simple_Mode.md)

[Updating Configurations to Latest Revision (Simple Mode)](markdown/SCM_Updating_Configurations_to_Latest_Revision_Simple_Mode.md)

[Updating Configurations (Advanced Mode)](markdown/SCM_Updating_a_Configuration.md)

[Updating Configurations to Latest Revision (Advanced Mode)](markdown/SCM_UpdateConfigurations_LatestRevision.md)

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Creating a Configuration](markdown/SCM_Creating_a_Configuration.md)


---

## Locking a Configuration

_Source: `markdown/SCM_Locking_a_Configuration.md`_

# Locking a Configuration

Proceed as follows to lock a configuration:

1. In the ASCET component manager, select the configurations you want to lock.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Get Lock for Configuration.
1. Close the Lock Configuration: Results dialog box.

You have to [lock the items](markdown/SCM_Locking_an_Item.md) in the configuration before you can edit them.

When you are done editing the configuration, you can [unlock it](markdown/SCM_Unlocking_a_Configuration.md) so that it can be locked by another user, or [commit it](markdown/SCM_Committing_a_Configuration.md) to the Subversion repository.

See also

[Locking an Item](markdown/SCM_Locking_an_Item.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Unlocking a Configuration](markdown/SCM_Unlocking_a_Configuration.md)

[Committing a Configuration (Simple Mode)](markdown/SCM_Committing_a_Configuration_Simple_Mode.md)

[Committing a Configuration (Advanced Mode)](markdown/SCM_Committing_a_Configuration.md)


---

## Unlocking a Configuration

_Source: `markdown/SCM_Unlocking_a_Configuration.md`_

# Unlocking a Configuration

Note that any locked configuration will be unlocked automatically when you commit it.

Proceed as follows to unlock a configuration manually:

1. In the ASCET component manager, select the currently locked configurations you want to unlock.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Release Lock for Configuration.
1. Close the Unlock Configuration: Results dialog box.

See also

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)

[Locking a Configuration](markdown/SCM_Locking_a_Configuration.md)

[Committing a Configuration (Simple Mode)](markdown/SCM_Committing_a_Configuration_Simple_Mode.md)

[Committing a Configuration (Advanced Mode)](markdown/SCM_Committing_a_Configuration.md)

[Results Dialog Box](markdown/SCM_Result_Dialog_Box.md)


---

## Updating Configurations (Simple Mode)

_Source: `markdown/SCM_Updating_Configurations_Simple_Mode.md`_

# Updating Configurations (Simple Mode)

To update configurations to a revision number:

1. In the ASCET component manager, select a base item with a configuration.
1. In the SCM menu, point to Configuration Management and select Update Configuration ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image28.gif).
1. Modify the configurations when necessary.
1. Repeat the previous step with different items when necessary.
1. Click the Update button to start the update.

If you select a folder, the Update Configuration command does not search for configurations in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" configurations, use the [Checkout Configuration](markdown/SCM_Checking_out_Configurations_Simple_Mode.md) command.

See also

[Updating](markdown/SCM_Updating.md)

[Update Configuration Dialog Box (Simple Mode)](markdown/SCM_Update_Configuration_Dialog_Box_Simple_Mode.md)

[Checking out a Configuration (Simple Mode)](markdown/SCM_Checking_out_Configurations_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Configurations (Advanced Mode)

_Source: `markdown/SCM_Updating_a_Configuration.md`_

# Updating Configurations

Proceed as follows to update configurations to a selected revision number:

1. In the ASCET component manager, select the configurations you want to update.
1. Open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), then point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update Configuration.
1. To select a revision for a single configuration, [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)do the following](javascript:void(0);).In the Update Configuration dialog box, right-click a configuration and select Change Revision from the context menu.The Select Revision of Configuration dialog box opens. It lists all configuration revisions available in the repository.Select the revision number you want to be loaded during update and click Ok.
1. To select a revision for multiple configurations, [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)do the following](javascript:void(0);).In the Update dialog box, select the desired configurations.Right-click the selection and select Change Revision from the context menu.The Revision for multiple selected items dialog box opens.Enter a revision number and click Ok.This revision is set for all selected items. If the selected revision does not exist for an item, the previously selected revision number is restored.
1. Click Next.
1. Select a revision for a single item or multiple items as described in steps 3 and 4.
1. Click Update to start the procedure.
1. Close the Update Configuration dialog box.

If you select a folder, the Update Configuration command does not search for configurations in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" configurations, use the [Checkout Configuration](markdown/SCM_Checking_out_a_Configuration.md) command.

See also

[Updating](markdown/SCM_Updating.md)

[Update Configuration Dialog Box (Advanced Mode)](markdown/SCM_Update_Configuration_Dialog_Box.md)

[Checking out a Configuration (Advanced Mode)](markdown/SCM_Checking_out_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Configurations to Latest Revision (Simple Mode)

_Source: `markdown/SCM_Updating_Configurations_to_Latest_Revision_Simple_Mode.md`_

# Updating Configurations to Latest Revision (Simple Mode)

To update configurations to the latest revision number:

1. In the ASCET component manager, select the items with configurations you want to update.
1. In the SCM menu, point to Configuration Management and select Update to Latest Configuration ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image29.gif).
1. Modify the configurations when necessary.
1. Repeat the previous step with different items when necessary.
1. Click the Update to Latest button to start the update.

If you select a folder, the Update to Latest Configuration command does not search for configurations in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" configurations, use the [Checkout Configuration](markdown/SCM_Checking_out_Configurations_Simple_Mode.md) command.

See also

[Updating](markdown/SCM_Updating.md)

[Update to Latest Configuration Dialog Box (Simple Mode)](markdown/SCM_Update_to_Latest_Configuration_Dialog_Box.md)

[Checking out a Configuration (Simple Mode)](markdown/SCM_Checking_out_Configurations_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Updating Configurations to Latest Revision (Advanced Mode)

_Source: `markdown/SCM_UpdateConfigurations_LatestRevision.md`_

# Updating Configurations to Latest Revision

Proceed as follows to update configurations to the latest revision number:

1. In the ASCET component manager, select the configurations you want to update.
1. Open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), then point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update to Latest Configuration.
1. Close the Update to Latest Configuration dialog box.

If you select a folder, the Update to Latest Configuration command does not search for configurations in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" configurations, use the [Checkout Configuration (Advanced Mode)](markdown/SCM_Checking_out_a_Configuration.md) command.

See also

[Updating](markdown/SCM_Updating.md)

[Updating Configurations (Advanced Mode)](markdown/SCM_Updating_a_Configuration.md)

[Checking out a Configuration (Advanced Mode)](markdown/SCM_Checking_out_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Comparing Configuration Versions (Simple Mode)

_Source: `markdown/SCM_Comparing_Configuration_Versions_Simple_Mode.md`_

# Comparing Configuration Versions (Simple Mode)

Proceed as follows to compare the current local status of a configuration with any existing of the same configuration:

1. In the ASCET component manager, select the configuration you want to compare to an older version.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, open the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu and select Compare Configuration.
1. Click ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_loupe.gif) to select a configuration for comparison.
1. Filter the comparison results if neccessary:
1. Click the Report button to save the comparison results as text file.

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Compare Configuration Dialog Box (Simple Mode)](markdown/SCM_Compare_Configuration_Dialog_Box_Simple_Mode.md)

[Compare Configuration Dialog Box (Advanced Mode)](markdown/SCM_Compare_Configuration_Dialog_Box.md)


---

## Comparing Configuration Versions (Advanced Mode)

_Source: `markdown/SCM_Comparing_Configuration_Versions.md`_

# Comparing Configuration Versions (Advanced Mode)

Proceed as follows to compare the current local status of a configuration with any existing of the same configuration:

1. In the ASCET component manager, select the configuration you want to compare to an older version.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, open the [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu and select Compare Configuration.
1. To select the version to be checked against the current one, right-click on the configuration entry, select Change Revision from the context menu and select the applicable revision number from the [Select Revision dialog box](markdown/SCM_Select_Revision_Dialog_Box.md).
1. Do the following:
1. In the Compare Configuration dialog box, click Next to display the Step 2 of 2 page.

This page highlights any differences between the current local version and the one you selected.

See also

[Handling Configurations](markdown/SCM_Handling_Configurations.md)

[Compare Configuration Dialog Box (Simple Mode)](markdown/SCM_Compare_Configuration_Dialog_Box_Simple_Mode.md)

[Compare Configuration Dialog Box (Advanced Mode)](markdown/SCM_Compare_Configuration_Dialog_Box.md)


---

## Committing a Configuration (Simple Mode)

_Source: `markdown/SCM_Committing_a_Configuration_Simple_Mode.md`_

# Committing a Configuration (Simple Mode)

When you are done editing a configuration that is already under version control, proceed as follows to commit (i.e. to check in) the configuration by storing its current status as a new version in the repository:

1. In the ASCET component manager, select the items with configurations you want to commit.
1. In the SCM menu, point to Configuration Management and select Commit Configuration ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image30.gif).
1. Click the Commit Configuration button to commit the configurations to the repository.

See also

[Committing](markdown/SCM_Committing.md)

[Managing ASCET Folders](markdown/SCM_Managing_ASCET_Folders.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Committing a Configuration (Advanced Mode)

_Source: `markdown/SCM_Committing_a_Configuration.md`_

# Committing a Configuration

When you are done editing a configuration that is already under version control, proceed as follows to commit (i.e. to check in) the configuration by storing its current status as a new version in the Subversion repository:

1. In the ASCET component manager, select the configuration you want to commit.
1. In the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu, point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Commit Configuration.
1. On the Step 1 of 3 page of this dialog box, select the configurations you want to commit.
1. Optionally, you can enter a comment for the configurations to be committed.
1. Click Commit to remove the lock of the configurations to be committed.
1. On this page, select the (now unlocked) configurations to be committed.
1. Click Commit to commit the elements included in the selected configurations and to display the next page of this dialog box.
1. Click Finish to save the current state of these configurations as a new version in the Subversion repository.

See also

[Committing](markdown/SCM_Committing.md)

[Managing ASCET Folders](markdown/SCM_Managing_ASCET_Folders.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Configuration Examples for CM Tools Connected With MSSCCI

_Source: `markdown/SCM_ConfigurationExamplesOverview.md`_

# Configuration Examples - Overview

Working with CM tools via the ASCET-SCM Microsoft Source Code Control Interface (MSSCCI) requires an initial configuration by selecting the MSSCCI driver in the Driver Selection dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleOverview.gif)

Configuration examples for the following CM tools supporting MSSCCI are provided as hints for the correct configuration:

- [SourceSafe](markdown/SCM_ConfigurationExampleSourceSafe.md)
- [Perforce](markdown/SCM_ConfigurationExamplePerforce.md)
- [Team Foundation Server (TFS)](markdown/SCM_ConfigurationExampleTFS.md)
- [ClearCase](markdown/SCM_ConfigurationExampleClearCase.md)
- [MKS](markdown/SCM_ConfigurationExampleMKS.md)

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)


---

## Configuration Example - SourceSafe

_Source: `markdown/SCM_ConfigurationExampleSourceSafe.md`_

# Configuration Example - SourceSafe

The Configure Selection button in the Driver Selection dialog box opens the SCM Settings window.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleSourceSafe1.gif)

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Field | meaning | example |
| Repository Path | path to srcsafe.ini | ..\Software\VisualSourceSafe\srcsafe.ini |
| Project Name | name of the project inside of SourceSafe | see first screenshot below |
| Local Workspace | exchange directory between ASCET & SourceSafe | see second screenshot below |

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleSourceSafe3.gif)

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleSourceSafe2.gif)

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## Configuration Example - Perforce

_Source: `markdown/SCM_ConfigurationExamplePerforce.md`_

# Configuration Example - Perforce

The Configure Selection button in the Driver Selection dialog box opens the SCM Settings window.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/examplePerforce1.gif)

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Field | meaning | example |
| Repository Path | path to depot folder in Perforce installation folder | ..\Program Files\Perforce\depot |
| Project Name | name of the workspace view inside of Perforce | see screenshot below |
| Local Workspace | exchange directory between ASCET & Perforce | D:\Temp\LocalWorkingDirectory\Perforce |

![](ms-its:ASCET_SCMEnglishUS.chm::/images/examplePerforce2a.gif)

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## Configuration Example - TFS

_Source: `markdown/SCM_ConfigurationExampleTFS.md`_

# Configuration Example - Team Foundation Server

The Configure Selection button in the Driver Selection dialog box opens the SCM Settings window.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleTFS1.gif)

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Field | meaning | example |
| Repository Path | server name & port | see screenshot above |
| Project Name | name of the project inside of TFS | see screenshot below |
| Local Workspace | exchange directory between ASCET & TFS | C:\Temp\TFS_MSSCCI |

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleTFS2.gif)

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## Configuration Example - ClearCase

_Source: `markdown/SCM_ConfigurationExampleClearCase.md`_

# Configuration Example - ClearCase

The Configure Selection button in the Driver Selection dialog box opens the SCM Settings window.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleClearCase.gif)

| Column 1 | Column 2 |
| --- | --- |
| Field | meaning |
| Repository Path | ClearCase view |
| Project Name | ClearCase view |
| Local Workspace | ClearCase view |

The ClearCase view combines all information needed to connect to ClearCase. Therefore, the information for Repository Path, Project Name and Local Workspace may be the same.

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## Configuration Example - MKS

_Source: `markdown/SCM_ConfigurationExampleMKS.md`_

# Configuration Example - MKS

The Configure Selection button in the Driver Selection dialog box opens the SCM Settings window.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/exampleMKS.gif)

| Column 1 | Column 2 |
| --- | --- |
| Field | meaning |
| Repository Path | MKS sandbox |
| Project Name | MKS sandbox |
| Local Workspace | MKS sandbox |

The MKS sandbox combines all information needed to connect to MKS. Therefore, the information for Repository Path, Project Name and Local Workspace may be the same.

See also

[Driver Selection Dialog Box](markdown/SCM_Driver_Selection_Dialog_Box.md)

[Configuration Examples - Overview](markdown/SCM_ConfigurationExamplesOverview.md)


---

## SCM Menu (with Version Management)

_Source: `markdown/SCM_ASCET-SCM_Menu.md`_

# SCM Menu (with Version Management)

ASCET-SCM adds the SCM menu to the menu bar in the ASCET component manager.

- Before you connect the current database or workspace to an SCM tool, the SCM menu contains the commands described in [SCM Menu (without Version Management)](markdown/SCM_Menu_withoutVersionManagement.md).
- Once you have [connected to an SCM tool](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md), this menu contains the commands required for source control. The content of this menu depends on the software version control product (e.g. [Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)) you are using, on the mode (i.e. [online or offline](markdown/SCM_Online_versus_Offline_Mode.md)) and on the access method through which you display the menu.

This topic describes the content of the SCM menu when the database/workspace is connected to Subversion, both in [online](#SCMmenuOnline) and [offline](#SCMmenuOffline) mode.

## Online Mode

Most commands of the SCM menu are available as Source Control context menu in the 1 Database or 1 Workspace list of the Component Manager, in the Outline tab of the component editors, and in the drawing area of block diagrams. Some of the commands included in the SCM menu are also available via [toolbar icons](markdown/SCM_Toolbar_Icons.md).

According to whether the Simple Mode user interface is [activated or deactivated](markdown/SCM_Activating_Deactivating_SimpleMode.md), dialog boxes will be shown in Simple Mode or Advanced Mode.

##### [Source Control](javascript:void(0);)

##### [Show](javascript:void(0);)

##### Checkout

Displays the Checkout dialog box in [Simple Mode](markdown/SCM_Checkout_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](markdown/SCM_Checkout_Dialog_Box.md) which enables you to check out items from the repository so that these can be edited in ASCET. See also: [Checking out](markdown/SCM_Checking_out.md).

##### Update

Displays the Update dialog box in [Simple Mode](markdown/SCM_Update_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](markdown/SCM_Update_Dialog_Box.md) from which you can select items to be refreshed by applying current data related to these items from the Subversion repository. See also: [Updating](markdown/SCM_Updating.md).

Note: If a folder is selected, this command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](#Checkout) command.

##### Update to Latest Revision

Retrieves the most recent data for the selected items from the Subversion repository. The Update to Latest Revision dialog box in [Simple Mode](markdown/SCM_Update_to_Latest_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](markdown/SCM_Update_to_Latest_DialogBox.md) prompts you to complete this procedure.

##### Get Lock

"Locks" (reserves) the selected items exclusively for you in the repository. While in the locked state, items can be edited only by you; other users cannot access these items at the same time. Other users who try to access an item locked by someone else will see a padlock in the item's icon in the browser tree. See also: [Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md).

##### Commit

Stores the current status of the selected items (including your edits) as a new version in the Subversion repository. See also: [Committing](markdown/SCM_Committing.md).

##### Add and Commit

Adds the currently selected items to version control and stores their current status (including your edits) as a new version in the Subversion repository. The Add and Commit dialog box prompts you to complete this procedure.

##### Check for Modifications

Compares all selected items that are under version control to their current status in the [repository](markdown/SCM_Repository.md). If the local status is out of date, the overlay icons change accordingly. If any items were locked by another user in the meantime (or unlocked) the status is set to "locked by other user" (or back to "revision"). The items checked for modifications are listed in a separate dialog box.

##### Show Log

Reads the Subversion history of the selected items in ASCET, retrieves the current history status of these items from the Subversion [repository](markdown/SCM_Repository.md), and displays the result in the [Show Log](markdown/SCM_Show_Log_Dialog_Box.md) dialog box.

##### Properties

Displays the [Version Details Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md)for the selected item.

##### [Configuration Management](javascript:void(0);)

##### [Additional Commands](javascript:void(0);)

##### [Including References](javascript:void(0);)

## Offline Mode

In offline mode, the SCM menu contains

##### [Source Control](javascript:void(0);)

##### [Show](javascript:void(0);)

##### Connect to Repository

Shown in [offline](markdown/SCM_Online_versus_Offline_Mode.md) mode only. Switches to online mode by connecting the Subversion driver to the repository URL. Note that you can disconnect from the Subversion repository by selecting [Disconnect from Repository](markdown/SCM_AdditionalCommandsSubmenu.md#Disconnect_from_Repository) from the Show submenu. See also [Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md).

##### Show Log

Shows the Subversion history that was read the last time a [Checkout](#Checkout), [Update](#Update) or [Update To Latest Revision](#Update_to_Latest_Revision) operation was executed on the selected item. Displays the result in the [Show Log](markdown/SCM_Show_Log_Dialog_Box.md) dialog box.

##### Properties

Displays the [Version Details dialog box](markdown/SCM_Version_Details_Dialog_Box.md) for the selected item. That dialog box shows the properties that were read the last time a [Checkout](#Checkout), [Update](#Update) or [Update To Latest Revision](#Update_to_Latest_Revision) operation was executed on the selected item.

See also

[SCM Menu (without Version Management)](markdown/SCM_Menu_withoutVersionManagement.md)

[Toolb[ar Icons](markdown/SCM_Menu_withoutVersionManagement.md)](SCM_Toolbar_Icons.md)

[Version Handling based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)

[Repository](markdown/SCM_Repository.md)


---

## SCM Menu (without Version Management)

_Source: `markdown/SCM_Menu_withoutVersionManagement.md`_

# SCM Menu (without Version Management)

ASCET-SCM adds the SCM menu to the menu bar in the ASCET component manager.

- Before you connect the current database or workspace to an SCM tool, the SCM menu contains the commands described in this topic.
- Once you have [connected to an SCM tool](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md), this menu contains the commands required for source control. The content of this menu depends on the software version control product (e.g. [Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)) you are using, on the mode (i.e. [online or offline](markdown/SCM_Online_versus_Offline_Mode.md)) and on the access method through which you display the menu.

See [SCM Menu (with Version Management)](markdown/SCM_ASCET-SCM_Menu.md) for a description of the SCM menu when the database/workspace is connected to Subversion.

##### Check Source Control Compatibility

Checks whether the current database or workspace contains items that may cause problems with source control.

##### Remove Source Control Bindings

Deletes any SCM information from the database or workspace. This comprises source control settings (SCM tool driver data) as well as SCM information on each item (e.g. version name, comment, …). This menu command can be used e.g. to clear all SCM-specific data before sending the data to other users who do not have the current SCM add-on installed or who have no access to the used repository.

Please be aware that, after clearing all SCM information, no further SCM activities can be performed for the database/workspace (e.g. no storing of new versions). To reconnect to an SCM repository, use the menu command [Configure Source Control](#Configure_Source_Control).

##### Remove Source Control Bindings for Selection

Deletes any SCM information for currently selected items. This command does not remove the current SCM settings for the database/workspace. This command is useful if items contain invalid SCM data (e.g. because the item’s repository entry was deleted externally).

##### Configure Source Control

Displays the [Driver Selection dialog box](markdown/SCM_Driver_Selection_Dialog_Box.md) via which you can select the driver for the SCM tool you want to use.

See also

[SCM Menu (with Version Management)](markdown/SCM_ASCET-SCM_Menu.md)

[Setting up an ASCET-Subversion Connection](markdown/SCM_Setting_up_an_ASCET-Subversion_Connection.md)

[Version Handling based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)

[Repository](markdown/SCM_Repository.md)

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Toolbar Icons

_Source: `markdown/SCM_Toolbar_Icons.md`_

# Toolbar Icons

Following the installation of ASCET-SCM, the ASCET-MD toolbar contains the following additional ASCET-SCM buttons.

##### Online Mode

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Icon | Name | Also available in |
|  | Checkout | SCM menu (online mode) |
|  | Update |  |
|  | Update to Latest Revision |  |
|  | Get Lock |  |
|  | Commit |  |
|  | Add and Commit |  |
|  | Check for Modifications |  |
|  | Show Log |  |
|  | Properties |  |
|  | Release Lock | SCM menu, Additional Commands submenu |
|  | Checkout Configuration | SCM menu, Configuration Management submenu |
|  | Update Configuration |  |
|  | Update to Latest Configuration |  |
|  | Commit Configuration |  |
|  | Add and Commit New Configuration |  |
|  | Show Configuration Log |  |
|  | Show Configuration Properties |  |

##### Offline Mode

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Icon | Name | Also available in |
|  | Connect to Repository | SCM menu (offline mode) |
|  | Edit without Lock |  |
|  | Show Log |  |
|  | Properties |  |

See also

[SCM Menu (with Version Management)](markdown/SCM_ASCET-SCM_Menu.md)

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Overlay Icons

_Source: `markdown/SCM_Overlay_Icons.md`_

# Overlay Icons

These small icons are visually "added" to the "regular" icons of the associated component (item or configuration) shown in the ASCET browser tree. They indicate the current state of the item or configuration.

| Column 1 | Column 2 |
| --- | --- |
| Icon | Description |
|  | The component (item or configuration) is under version control. It is write-protected (which does not imply a Lock ). This is the default state following a Checkout . |
|  | The repository contains a version of this component (item or configuration) that is more recent than the one contained in the current ASCET database or workspace. |
|  | The component was modified. |
|  | This component (item or configuration) is locked, but has not yet been modified. |
|  | Another user has locked this component (item or configuration). |
|  | An Edit without Lock was performed on this component (item or configuration); however, the component was not yet modified. |
|  | The content of this component is invalid. This can only happen if you import ( File , Import ) a different version of the component and the existing version is not editable at the time of the import. See also: Special Use Case: Handling Imported Components . |
|  |  |
|  |  |
|  |  |
|  |  |


---

## Driver Selection Dialog Box

_Source: `markdown/SCM_Driver_Selection_Dialog_Box.md`_

# Driver Selection Dialog Box

This dialog box is displayed when you select [Configure Source Control](markdown/SCM_Menu_withoutVersionManagement.md#Configure_Source_Control) from the [SCM](markdown/SCM_Menu_withoutVersionManagement.md) menu when the current ASCET database or workspace is not under revision control.

This dialog box serves for selecting the driver for the SCM tool you want to use.

##### Configure Selection

Displays the configuration dialog box for the selected SCM driver. For instance, if you selected the Subversion driver, the [Subversion Settings dialog box](markdown/SCM_Subversion_Settings_Dialog_Box.md) is shown.

##### OK

Accepts your selection and closes the dialog box.

##### Cancel

Closes the dialog box and discards your selection.

See also

[Setting up Subversion for Use with ASCET-SCM](markdown/SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md)


---

## Tool Options for ASCET-SCM

_Source: `markdown/SCM_Tool_Options_for_ASCET-SCM.md`_

# Tool Options for ASCET-SCM

The ASCET Options window is opened with the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_ASCEToptions.gif) Options button in the ASCET component manager or the component editors.

The ASCET Options window provides the node Integration\Source Control for setting up ASCET-SCM. This node includes the following options:

##### Export Format

Defines the format used for components export. This can be either the "old" binary export format (*.exp), the format (*.amd) offered by ASCET V5.2.0 or later versions, or a combination of both (combined binary+XML format)

##### Preferred Import Format

Defines which type of export file format (*.exp or *.amd; see above) is imported if multiple variants are available in the SCM [repository](markdown/SCM_Repository.md).

##### Local Working Directory

Specifies the path of the local working directory used by the SCM tool and thus for ASCET export/import. This directory is also used by the [SVN driver](markdown/SCM_Driver_Selection_Dialog_Box.md) to create a local copy of the selected [repository](markdown/SCM_Repository.md).

In Microsoft Windows®, folder and file names are limited to a maximum of 255 characters in length. Please bear in mind that exchange data will be placed within the local working directory using the same folder structure as in the ASCET database or workspace. (ASCET has no limit of 255 characters for its folder structures!). For SVN data, the folder structure comprises <Local working directory> + <SVN repository URL (following ":/") + <ASCET folder structure> + <ASCET file name with extension>.

##### Server Logfile

Specifies the file used for logging all activities during ASCET-SCM operations. Please send this file to ETAS support if any problems occur.

##### Custom Diff Tool

Specifies the installation path and filename of a tool (e.g. ASCET-DIFF) for comparing ASCET export data. This tool can be used to compare different versions of ASCET items, e.g. via the [Show Log](markdown/SCM_ASCET-SCM_Menu.md#Show_Log) command.

##### Custom ASCET Version String

Specifies the ASCET version string used to identify the ASCET version in the [repository](markdown/SCM_Repository.md). This version string is used by SCM tool interfaces to define the export version of ASCET models.

##### Skip Unmodified Items

If this option is checked, all items in a list will be ignored if they have not been changed locally. Consequently:

- When you [commit](markdown/SCM_Committing.md) a folder, items that have not been modified will not be committed.
- When you load items, these will not be imported if the same revision is selected as the one currently loaded in ASCET and no local changes have been performed.

##### Logging Level

Specifies the level at which logging is done.

##### Allow commit with missing references

If activated (default), commiting editions is possible even if missing references are detected during commit.

If deactivated, commiting an edition with missing references is not possible.

[Appearance](markdown/SCM_Appearance_Options_for_ASCET-SCM.md) options are provided on a separate page.

See also

[Setting up Subversion for Use with ASCET-SCM](markdown/SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md)


---

## Appearance Options for ASCET-SCM

_Source: `markdown/SCM_Appearance_Options_for_ASCET-SCM.md`_

# Appearance Options for ASCET-SCM

The ASCET Options window is opened with the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_ASCEToptions.gif) Options button in the component manager or the component editors.

The Integration\ASCET-SCM\Appearance node in the ASCET Options window provides the following options for ASCET-SCM:

##### Use Simple Mode UIs

Enables the Simple Mode user interface for dialogs. If this checkbox is not checked, dialogs will show full functionality.

##### Show Overlay Icons

This option shows or hides SCM-specific icons that visualize the current SCM status. For instance, a red exclamation mark (![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24b.gif)) icon can be shown for locally changed items that are currently under version control in Subversion.

##### Allow Modification of Selection

Displays an extra screen that allows modifications of the selection before an SCM command is executed. For instance, in the Subversion interface, this is used with the commands [Update to Latest Revision](markdown/SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision) and [Get Lock](markdown/SCM_ASCET-SCM_Menu.md#Get_Lock).

##### Show Edition Comment Dialog when Creating Editions

Displays a selection dialog when the status of items is changed to "Edition". This enables the user to enter a comment for the edition (if supported by the SCM tool interface)

##### Show Component History in Selection Dialog

Enables the display of the component history in the selection dialog.

##### Warn when Using Local Editions

Displays a warning when you use local editions.

##### Warn of Conflicts

Displays a warning if the local database or workspace is about to be overwritten by your SCM operations.

##### Use Sub Menu for Component Editor Context Menus

Displays an ASCET-SCM menu list in a separate Source Control submenu. If this checkbox is not checked, all SCM menu commands are listed directly.

##### Use Sub Menu for Component Manager Context Menu

Displays an ASCET-SCM menu list in a separate Source Control submenu. If this checkbox is not checked, all SCM menu commands are listed directly.

##### Show Toolbar in Component Manager

Displays the ASCET-SCM toolbar within the Component Manager

##### Show List of Items Changed by SCM Operation

Displays a list of items after an SCM operation in a dialog similar to the import result list.

You can open ASCET editors directly from this dialog. For instance, you can simply click on a list entry to show the item within the ASCET database/workspace structure, etc.

##### Show Result Dialog

Displays the [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md) which list of items after each SCM operation with details about the operation results. Depending on your selection for this option, this list is shown always, only in case of errors or never.

##### Display External Repository ID

Displays the IDs of External Repositories when used.

##### Show Truncated External Repository ID

Truncates the IDs of External Repositories.

See also

[Setting up Subversion for Use with ASCET-SCM](markdown/SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md)


---

## Subversion Settings Dialog Box

_Source: `markdown/SCM_Subversion_Settings_Dialog_Box.md`_

# Subversion Settings Dialog Box

This dialog box enables you to view and/or modify settings for Subversion instance you are using for software version control. It can be displayed via the Show Source Control Settings command in the [Source Control](markdown/SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) submenu of the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md).

##### Repository Settings

Repository URL: Displays the URL of the Subversion repository you are currently using to handle ASCET data. This URL will be used as the basis for any SVN operation in ASCET. All ASCET items will be placed below this URL in a folder structure similar to the structure within the ASCET database or workspace. See also [Selecting a Repository](markdown/SCM_Selecting_a_Repository.md).

Current restriction: The repository URL has to contain at least two levels of folders (e.g. file:///c:/repository/v_trnk/). If the URL is "too short", ASCET-SCM cannot access it.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_OpenRepo.gif): Opens the repository browser to check the URL.

User Name: Login user name to be used for selected repository. The Windows user name is set as the default value. This entry may need to be adapted to the current repository environment (e.g. if a domain is needed). If a password is required the user may be prompted to enter it via a separate login dialog provided by the Subversion driver.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Test Connection: When you press this button, ASCET-SCM attempts to connect to the currently selected repository URL. If this connection works, a separate dialog box return the message Repository URL tested successfully. If you do not press this button, the connection will be tested after you close this dialog box.

##### Subversion Driver Information

This section displays (read-only) data pertaining to the Subversion driver you are currently using.

Subversion Driver Version: Displays the version of the Subversion driver you are currently using.

Supported Subversion Tool: Displays the version of the Subversion tool you are currently using.

Subversion Installation Path: Displays the path where the Subversion instance you are using is installed.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) OK

Closes the dialog box and accepts the settings.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

Closes the dialog box and discards the settings.

See also

[Tool Options for ASCET-SCM](markdown/SCM_Tool_Options_for_ASCET-SCM.md)


---

## Checkout Dialog Box (Simple Mode)

_Source: `markdown/SCM_Checkout_Dialog_Box_Simple_Mode.md`_

# Checkout Dialog Box (Simple Mode)

This dialog box serves for [checking out items from the repository in Simple Mode](markdown/SCM_Checking_out_Items.md) so these can be edited in ASCET. It can be displayed via the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the repository content shown in the tree view with the filter button. Saves entered values in a drop down list. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of the items in the repository. | Alt + C |
|  | Available Revision table: Lists the revisions of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected revisions in the Available Revision table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected revision from the Available Revision table to the Selected Revision table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected revision from the Selected Revision table. | Ctrl + Shift + R |
|  | Selected Revision table: Lists the revisions selected for checkout. | Alt + S |
|  | Checkout: Loads the selected revisions from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the checkout operation. | ESC |

See also

[Checking out](markdown/SCM_Checking_out.md)

[Checking out Items (Simple Mode)](markdown/SCM_Checking_out_Items_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Checkout Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Checkout_Dialog_Box.md`_

# Checkout Dialog Box

This dialog box serves for [checking out items from the repository](markdown/SCM_Checking_out_Items.md) so these can be edited in ASCET. It can be displayed via the [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

##### Step 1 of 4

Search Criteria field: You can enter search criteria to filter (i.e. narrow down) your selection. ASCET-SCM stores items in files with the extension ".zip". Optionally, you can use the "*" (asterisk) wildcard at the beginning or at the end of ASCET version or configuration names.

Repository Content pane: Provides a tree view of the items found in the repository.

Selected Elements pane: Lists the items you selected by ASCET item name (*.zip) and path.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) >>: Copies the selected item from the Repository Content pane to the Selected Elements pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <<: Removes the selected item from the Selected Elements pane.

##### Step 2 of 4

Provides a more detailed overview of the items you selected in Step 1 of 4. Items can be deleted from the list shown on this page.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Displays the Step 3 of 4 page (conflicts detected, checkout not yet performed) or Step 4 of 4 page (no conflicts detected, checkout performed) of this dialog box.

##### Step 3 of 4 (optional)

Collects the item data from the ASCET database or workspace. Any conflicts detected are listed in the Elements with Conflicts table (see also [Conflicts Found Dialog Box](markdown/SCM_Conflicts_Found_Dialog_Box.md)). Items can be deleted from the list shown on this page. When you click the Checkout button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Performs the checkout (if possible) and displays the Step 4 of 4 page of this dialog box.

##### Step 4 of 4 (optional)

Lists your final selection of items to be checked out. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the checkout operation.

##### Other Buttons

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Returns to the previous display page (and thus to the previous step) in the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

See also

[Checking out](markdown/SCM_Checking_out.md)

[Checking out Items (Advanced Mode)](markdown/SCM_Checking_out_Items.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update Dialog Box (Simple Mode)

_Source: `markdown/SCM_Update_Dialog_Box_Simple_Mode.md`_

# Update Dialog Box (Simple Mode)

This dialog box serves for [updating](markdown/SCM_Updating.md) items. It can be displayed via the [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the items selected for updating with the filter button. Saves entered values in a drop down list. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of the items selected for updating. | Alt + C |
|  | Available Revision table: Lists the revisions of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected revisions in the Available Revision table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected revision from the Available Revision table to the Selected Revision table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected revision from the Selected Revision table. | Ctrl + Shift + R |
|  | Selected Revision table: Lists the revisions selected for checkout. | Alt + S |
|  | Checkout: Updates the selected revisions from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the update operation. | Esc |

See also

[Updating Items (Simple Mode)](markdown/SCM_Updating_Items_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Update_Dialog_Box.md`_

# Update Dialog Box

This dialog box serves for [updating](markdown/SCM_Updating.md) items. It can be displayed via the [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

##### Step 1 of 2

This page lists the item(s) you selected for updating. Optionally, you can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Updates the item(s) by loading the data from the repository, importing the data to ASCET and refreshing the item display on the next page.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the update operation.

##### Step 2 of 2

Lists your selection of items to be updated. Optionally, you can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp)Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the update operation.

See also

[Updating Items (Advanced Mode)](markdown/SCM_Updating_Items.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update to Latest Dialog Box (Simple Mode)

_Source: `markdown/SCM_Update_to_Latest_Dialog_Box_Simple_Mode.md`_

# Update to Latest Dialog Box (Simple Mode)

This dialog box serves for [updating](markdown/SCM_Updating.md) items to the latest revision. It can be displayed via the [Update to Latest Revision](markdown/SCM_ASCET-SCM_Menu.md#Update) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the items selected for updating with the filter button. Saves entered values in a drop down list. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of the items selected for updating. | Alt + C |
|  | Available Revision table: Lists the revisions of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected revisions in the Available Revision table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected revision from the Available Revision table to the Selected Revision table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected revision from the Selected Revision table. | Ctrl + Shift + R |
|  | Selected Revision table: Lists the revisions selected for checkout. | Alt + S |
|  | Checkout: Updates the selected items from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the update operation. | Esc |

See also

[Updating Items (Simple Mode)](markdown/SCM_Updating_Items_Simple_Mode.md)

[Updating Items to Latest Revision (Simple Mode)](markdown/SCM_Updating_Items_to_Latest_Revision_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update to Latest Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Update_to_Latest_DialogBox.md`_

# Update to Latest Dialog Box

This dialog box contains the following items:

##### Results Table

Lists the items that were selected for the update, and shows the results of the operation. Optionally, you can right-click on an item listed here to display the [context menu for the Results dialog box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory

The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close

Completes the update operation.

See also

[Updating Items (Advanced Mode)](markdown/SCM_Updating_Items.md)

[Updating Items to Latest Revision (Advanced Mode)](markdown/SCM_Update_to_LatestRevision.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Commit Dialog Box (Simple Mode)

_Source: `markdown/SCM_Commit_Dialog_Box_Simple_Mode.md`_

# Commit Dialog Box (Simple Mode)

This dialog box serves for committing ("checking in") items. It can be displayed via the [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Configuration table: Lists the items selected for committing. Enables activation/deactivation of items with checkbox buttons. | Alt + C |
|  | Configuration Details pane: Shows the properties of an item selected in the Configuration table, such as element path, version and comments. These properties are editable for new items which are not yet under version control. |  |
|  | Apply: Applies the values in the Configuration Details to the selected items in the Configuration table. In this dialog, only the Comments fields will be edited. | Ctrl + Shift + A |
|  | More>>/<<Less: Shows/hides additional properties of an item selected in the Configuration table. | Ctrl + Shift + M |
|  | Commit: Commits the selected items to the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the commit operation. | Esc |

See also

[Committing an Item](markdown/SCM_Committing.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Commit Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Commit_Dialog_Box.md`_

# Commit Dialog Box

This dialog box serves for committing ("checking in") items. It can be displayed via the [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

##### Step 1 of 2

This page lists the item(s) you selected for committing. Optionally, you can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

In the Comment section, you can enter a comment text for the current version of each item.

In Subversion, only one comment can be defined for each transaction. If you are committing multiple items at once, the comment defined for the first item will be used for all items in the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Commit: Exports the selected items from ASCET to the repository and writes back the refreshed SCM data to ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 2 of 2

Lists your selection of items that have been committed. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

Optionally, yon can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the commit operation.

See also

[Committing an Item](markdown/SCM_Committing.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Add and Commit Dialog Box

_Source: `markdown/SCM_Add_and_Commit_Dialog_Box.md`_

# Add and Commit Dialog Box

This dialog box enables you to bring the selected items under version control and to commit these items. It can be displayed via the [Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

Note that the "commit" part of this operation is the same that is provided by the Commit dialog box.

See also

[Adding and Committing an Item (Advanced Mode)](markdown/SCM_Adding_and_Committing_an_Item.md)

[Committing an Item](markdown/SCM_Committing.md)

[Commit Dialog Box (Simple Mode)](markdown/SCM_Commit_Dialog_Box_Simple_Mode.md)

[Commit Dialog Box (Advanced Mode)](markdown/SCM_Commit_Dialog_Box.md)


---

## Update and Lock Dialog Box

_Source: `markdown/SCM_Update_and_Lock_Dialog_Box.md`_

# Update and Lock Dialog Box

This dialog box lists the result of the Update and Lock command in the [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) submenu.

See also: [Results](markdown/SCM_Result_Dialog_Box.md) dialog box.

See also

[Updating Items to Latest Revision (Simple Mode)](markdown/SCM_Updating_Items_to_Latest_Revision_Simple_Mode.md)

[Updating Items to Latest Revision (Advanced Mode)](markdown/SCM_Update_to_LatestRevision.md)

[Locking an Item](markdown/SCM_Locking_an_Item.md)

[Updating](markdown/SCM_Updating.md)

[Locking and Unlocking](markdown/SCM_Locking_and_Unlocking.md)


---

## Select Revision Dialog Box

_Source: `markdown/SCM_Select_Revision_Dialog_Box.md`_

# Select Revision Dialog Box

This dialog box enables you to select a revision number (e.g. for the [Compare Configurations operation](markdown/SCM_Comparing_Configuration_Versions.md)) or a common revision number for multiple items (e.g. for the [Update](markdown/SCM_Updating.md) operation).


---

## ASCET-SCM Remove Dialog Box

_Source: `markdown/SCM_ASCET-SCM_Delete_Elements_Dialog_Box.md`_

# ASCET-SCM Remove Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Delete.

If you click Yes to confirm the deletion, all items that will be deleted are listed, with version details, in the [Remove dialog box](markdown/SCM_Delete_Dialog_Box.md).


---

## Remove Dialog Box

_Source: `markdown/SCM_Delete_Dialog_Box.md`_

# Remove Dialog Box

This dialog box is displayed if you click Yes in the [ASCET-SCM](markdown/SCM_ASCET-SCM_Delete_Elements_Dialog_Box.md)Remove dialog box.

This dialog box lists all items to be deleted and their associated version details.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

Removes selected item(s) from the list (Status SCM_IGNORE in the table); these item(s) will not be deleted.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

Undoes a previous Remove selected items ... operation for selected item(s) with status SCM_IGNORE.

##### Write to Log

Writes the revision history of the selected item (including deletion details) to a log file. A separate file browser is displayed via which you can specify or select this log file.

##### Remove

Performs the deletion.

##### Cancel

Aborts the deletion and closes the dialog box.


---

## Local Modifications Detected Dialog Box

_Source: `markdown/SCM_Local_Modifications_Detected_Dialog_Box.md`_

# Local Modifications Detected Dialog Box

This dialog box is displayed if you selected an item for [updating](markdown/SCM_ASCET-SCM_Menu.md#Update) that has been changed in your current ASCET session.

##### Yes

Performs the update, applying current data for the locally changed item from the Subversion repository.

This step undoes the local changes you performed on the item.

##### No

Closes this dialog and aborts the update.

See also

[Updating Items](markdown/SCM_Updating_Items.md)

[Updating Items to Latest Revision](markdown/SCM_Update_to_LatestRevision.md)


---

## Time Consuming Operation Dialog Box

_Source: `markdown/SCM_Time_Consuming_Operation_Dialog_Box.md`_

# Time Consuming Operation Dialog Box

This dialog box is shown when the current operation takes longer than just a few moments.


---

## Edit without Lock Dialog Box

_Source: `markdown/SCM_Edit_without_Lock_Dialog_Box.md`_

# Edit without Lock Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Edit without Lock.

This dialog box serves for making selected items editable without locking them in the Subversion repository.

See also

[Commit without Previous Lock Dialog Box](markdown/SCM_Commit_without_Previous_Lock_Dialog_Box.md)

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Commit without Previous Lock Dialog Box (Simple Mode)

_Source: `markdown/SCM_Commit_Without_Previous_Lock_Dialog_Box_Simple_Mode.md`_

# Commit Without Previous Lock (Simple Mode)

This dialog box serves for committing ("checking in") items. It can be displayed via the [Commit](markdown/SCM_ASCET-SCM_Menu.md#Commit) command in the [SCM](markdown/SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Configuration table: Lists the items selected for committing. Enables activation/deactivation of items with checkbox buttons. | Alt + C |
|  | Configuration Details pane: Shows the properties of an item selected in the Configuration table, such as element path, version and comments. These properties are editable for new items which are not yet under version control. |  |
|  | Apply: Applies the values in the Configuration Details to the selected items in the Configuration table. In this dialog, only the Comments fields will be edited. | Ctrl + Shift + A |
|  | More>>/<<Less: Shows/hides additional properties of an item selected in the Configuration table. | Ctrl + Shift + M |
|  | Commit Without Previous Lock: Commits the selected items to the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the commit operation. | Esc |

See also

[Edit without Lock Dialog Box](markdown/SCM_Edit_without_Lock_Dialog_Box.md)

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Commit without Previous Lock Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Commit_without_Previous_Lock_Dialog_Box.md`_

# Commit without Previous Lock Dialog Box (Advanced Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Additional Commands](markdown/SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Commit New Revision without Lock.

This dialog box serves for committing ("checking in") items to which you [applied the Edit without Lock command](markdown/SCM_Editing_Items_in_Offline_Mode.md).

##### Step 1 of 2

This page lists the item(s) you selected for committing. Optionally, you can right-click on an item listed here to display the [context menu for the Update and Commit dialog boxes](markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

In the Comment section, you can enter a comment text for the current version of each item.

In Subversion, only one comment can be defined for each transaction. If you are committing multiple items at once, the comment defined for the first item will be used for all items in the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Finish: Exports the selected items from ASCET to the repository and writes back the refreshed SCM data to ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 2 of 2

Lists your selection of items to be committed. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

Optionally, yon can right-click on an item listed here to display the [context menu for the Result dialog box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the commit operation.

See also

[Edit without Lock Dialog Box](markdown/SCM_Edit_without_Lock_Dialog_Box.md)

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)


---

## Checkout Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Checkout_Configuration_Dialog_Box_Simple_Mode.md`_

# Checkout Configuration Dialog Box (Simple Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Checkout Configuration. It enables you to check out configurations from the repository.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the repository content shown in the tree view with the filter button. Saves entered values in a drop down list. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of repository items containing configurations. | Alt + C |
|  | Available Configuration table: Lists the configurations of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected items in the Available Configuration table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected configuration from the Available Configuration table to the Selected Configuration table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected configuration from the Selected Configuration table. | Ctrl + Shift + R |
|  | Selected Configuration table: Lists the configurations selected for checkout. | Alt + S |
|  | Checkout: Loads the selected configurations from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the checkout operation. | ESC |

See also

[Checking out a Configuration (Simple Mode)](markdown/SCM_Checking_out_Configurations_Simple_Mode.md)

[Checking out](markdown/SCM_Checking_out.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Checkout Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Checkout_Configuration_Dialog_Box.md`_

# Checkout Configuration Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Checkout Configuration.

This dialog box enables you to check out configurations from the repository.

##### Step 1 of 5

Search Criteria field: You can enter search criteria to filter (i.e. narrow down) your selection. For Subversion, ASCET configurations are stored as files with the extension ".scmconfiguration.amd". Optionally, you can use the "*" (asterisk) wildcard at the beginning and at the end of ASCET configuration names.

Repository Content pane: Provides a tree view of the items found in the repository.

Selected Elements pane: Lists the items you selected from the Repository Content pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) >>: Copies the selected item from the Repository Content pane to the Selected Elements pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <<: Removes the selected item from the Selected Elements pane.

##### Step 2 of 5

Provides a more detailed overview of the items you selected in Step 1 of 5.

##### Step 3 of 5

Shows all item revisions contained in the selected configurations. Items can be deleted from the list. If multiple configurations are loaded in parallel, there might be several different revisions listed for the same (referenced) item. ASCET-SCM will only import one revision of each item. Double entries are "grayed out" and will be ignored.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Displays the Step 4 of 5 page (conflicts detected, checkout not yet performed) or Step 5 of 5 page (no conflicts detected, checkout performed) of this dialog box.

##### Step 4 of 5 (optional)

Any conflicts detected are listed in the [Conflicts Found Dialog Box](markdown/SCM_Conflicts_Found_Dialog_Box.md). Items can be deleted from the list shown on this page. When you click the Checkout button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Performs the checkout (if possible) and displays the Step 5 of 5 page of this dialog box.

##### Step 5 of 5

Lists the result of the checkout operation. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the checkout operation.

##### Other Buttons

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Returns to the previous display page (and thus to the previous step) in the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

See also

[Checking out a Configuration (Advanced Mode)](markdown/SCM_Checking_out_a_Configuration.md)

[Checking out](markdown/SCM_Checking_out.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Add and Commit Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Add_and_Commit_Configuration_Dialog_Box_Simple_Mode.md`_

# Add and Commit Configuration Dialog Box (Simple Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Add and Commit Configuration. It enables you to bring the selected configurations under version control and to commit these configurations.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Configuration table: Lists the items with configurations selected for committing. Enables activation/deactivation of items with checkbox buttons. | Alt + C |
|  | Configuration Details pane: Shows the properties of an item selected in the Configuration table, such as element path, version and comments. These properties are editable for new items which are not under version control, yet. |  |
|  | Apply: Applies the values in the Configuration Details to the selected items in the Configuration table. In this dialog, only the Comments fields will be edited. | Ctrl + Shift + A |
|  | More>>/<<Less: Shows/hides additional properties of an item selected in the Configuration table. | Ctrl + Shift + M |
|  | Commit: Commits the selected items with configurations to the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the add and commit operation. | Esc |

See also

[Committing a Configuration (Simple Mode)](markdown/SCM_Committing_a_Configuration_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Add and Commit Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Add_and_Commit_Configuration_Dialog_Box.md`_

# Add and Commit Configuration Dialog Box (Advanced Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Add and Commit Configuration.

This dialog box enables you to bring the selected configurations under version control and to commit these configurations.

Note that the "commit" part of this operation is the same that is provided by the [Commit Configuration Dialog Box](markdown/SCM_Commit_Configuration_Dialog_Box.md).

See also

[Committing a Configuration (Advanced Mode)](markdown/SCM_Committing_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Update_Configuration_Dialog_Box_Simple_Mode.md`_

# Update Configuration Dialog Box (Simple Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update Configuration. This dialog box serves for [updating](markdown/SCM_Updating.md) configurations.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the repository content shown in the tree view with the filter button. Saves entered values in a drop down table. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of repository items containing configurations. | Alt + C |
|  | Available Configuration table: Lists the configurations of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected items in the Available Configuration table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected configuration from the Available Configuration table to the Selected Configuration table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected configuration from the Selected Configuration table. | Ctrl + Shift + R |
|  | Selected Configuration table: Lists the configurations selected for updating. | Alt + S |
|  | Update: Loads the selected configurations from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the update operation. | Esc |

See also

[Updating a Configuration (Simple Mode)](markdown/SCM_Updating_Configurations_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Update_Configuration_Dialog_Box.md`_

# Update Configuration Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update Configuration.

This dialog box serves for [updating](markdown/SCM_Updating.md) configurations.

##### Step 1 of 4

This page lists the configurations you selected for updating. Optionally, you can right-click on a configuration listed here to display the [Context Menu for Selected Items](markdown/SCM_Context_Menu_for_Selected_Items.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif)Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) can be used to refine the selection.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the update operation.

##### Step 2 of 4

Lists the details of the configurations selected for update. Optionally, yon can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Displays the previous page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Updates the selected configuration(s) and imports the updated configuration data to ASCET and displays the next page.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

##### Step 3 of 4 (optional)

Any conflicts detected are listed. Items can be deleted from the list shown on this page. When you click the Update button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Performs the update (if possible) and displays the Step 4 of 4 page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

##### Step 4 of 4

Lists the result of the update operation. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md). Optionally, you can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

See also

[Updating a Configuration (Advanced Mode)](markdown/SCM_Updating_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update to Latest Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Update_Configuration_to_Latest_Dialog_Box_Simple_Mode.md`_

# Update to Latest Configuration Dialog Box (Simple Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update to Latest Configuration. This dialog box serves for [updating](markdown/SCM_Updating.md) to the latest configuration.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Repository Content combo box: Filters the repository content shown in the tree view with the filter button. Saves entered values in a drop down table. |  |
|  | Repository Content filter button: Starts filtering for values entered in the combo box. | Ctrl + F |
|  | Repository Content tree view: Provides an overview of repository items containing configurations. | Alt + C |
|  | Available Configuration table: Lists the configurations of an item selected in the Repository Content tree view. | Alt + A |
|  | Compare Selected Version: Compares two selected items in the Available Configuration table. | Ctrl + Shift + C |
|  | Add Selection: Copies the selected configuration from the Available Configuration table to the Selected Configuration table. | Ctrl + Shift + A |
|  | Remove Selection: Removes the selected configuration from the Selected Configuration table. | Ctrl + Shift + R |
|  | Selected Configuration table: Lists the configurations selected for updating. | Alt + S |
|  | Update to Latest Loads the selected configurations from the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the update operation. | Esc |

See also

[Update Configuration Dialog Box (Simple Mode)](markdown/SCM_Update_Configuration_Dialog_Box_Simple_Mode.md)

[Updating Configurations to Latest Revision (Simple Mode)](markdown/SCM_Updating_Configurations_to_Latest_Revision_Simple_Mode.md)

[Updating a Configuration (Simple Mode)](markdown/SCM_Updating_Configurations_Simple_Mode.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Update to Latest Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Update_to_Latest_Configuration_Dialog_Box.md`_

# Update to Latest Configuration Dialog Box

If no conflicts are found during update to latest configuration, only the results page of the Update to Latest Configuration dialog box opens. This page contains the following items:

Results table: Lists the result of the update operation (see also [Results](markdown/SCM_Result_Dialog_Box.md) Dialog Box). Optionally, you can right-click on an item listed here to display the [context menu for the Results dialog box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

If conflicts are found during update to latest configuration, the "Elements with Conflicts" page of the Update to Latest Configuration dialog box opens. This page contains the following items:

Elements with Conflicts table: Any conflicts detected are listed. Items can be removed from the list shown on this page. When you click the Update button on this page, all remaining non-critical conflicting configurations and all non-conflicting configurations are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list: Can be used to remove conflicting configurations from the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Displays the previous page of this dialog box; identical to [Step 2 of 4](markdown/SCM_Update_Configuration_Dialog_Box.md#Step2of4) in the Update Configuration dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Performs the update of all non-critical conflicting configurations and all non-conflicting configurations and displays the [results page](#Results_page) of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box and discards the update operation.

See also

[Update Configuration Dialog Box (Advanced Mode)](markdown/SCM_Update_Configuration_Dialog_Box.md)

[Results Dialog Box](markdown/SCM_Result_Dialog_Box.md)

[Updating Configurations to Latest Revision (Advanced Mode)](markdown/SCM_UpdateConfigurations_LatestRevision.md)

[Updating a Configuration (Advanced Mode)](markdown/SCM_Updating_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Commit Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Commit_Configuration_Dialog_Box_Simple_Mode.md`_

# Commit Configuration Dialog Box (Simple Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Commit Configuration. It serves for committing ("checking in") configurations.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Configuration table: Lists the items with configurations selected for committing. Enables activation/deactivation of items with checkbox buttons. | Alt + C |
|  | Configuration Details pane: Shows the properties of an item selected in the Configuration table, such as element path, version and comments. These properties are editable for new items which are not under version control, yet. | Alt + C |
|  | Apply: Applies the values in the Configuration Details to the selected items in the Configuration table. In this dialog, only the Comments fields will be edited. | Ctrl + Shift + A |
|  | More>>/<<Less: Shows/hides additional properties of an item selected in the Configuration table. | Ctrl + Shift + M |
|  | Commit Configuration: Commits the selected items with configurations to the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the add and commit operation. | Esc |

See also

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Commit Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Commit_Configuration_Dialog_Box.md`_

# Commit Configuration Dialog Box (Advanced Mode)

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md), point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Commit Configuration.

This dialog box serves for committing ("checking in") configurations.

The exact sequence of steps (including the display of pages) depends on whether or not items are involved that are not yet under version control and whether or not there are locked items that have been modified. Consequently, the sequence of pages may vary.

##### Step 1 of 3

This page lists the configurations(s) you selected for committing. Optionally, you can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database: If a compare tool is installed and its installation path is specified via the Custom Diff Tool settings in the ASCET-SCM [Tool Options](markdown/SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool), you can use this button to compare a selected configuration to the local status of the items in ASCET.

In the Comment section, you can enter a comment text for the current version of each item.

In Subversion, only one comment can be defined for each transaction. If you are committing multiple items at once, the comment defined for the first item will be used for all items in the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Commit: Exports the selected configuration from ASCET to the repository and writes back the refreshed SCM data to ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 2 of 3

Lists the details of the configurations to be committed. Optionally, yon can right-click on an item listed here to display its context menu.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Commit: Commits the configuration elements included in the selected configurations and displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 3 of 3

Lists the result of the previous step. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md).

Optionally, yon can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes the Commit Configuration dialog box.

See also

[Activating/Deactivating the Simple Mode User Interface](markdown/SCM_Activating_Deactivating_SimpleMode.md)


---

## Configuration Details Dialog Box

_Source: `markdown/SCM_Configuration_Details_Dialog_Box.md`_

# Configuration Details Dialog Box

This dialog box is displayed when you click the Configuration Details button in the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md).

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Show as Tree / Show as List

Toggles to provide a tree view or a list view of the configuration contents.

See also

[Loading a Configuration](markdown/SCM_Loading_a_Configuration.md)


---

## Compare Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Compare_Configuration_Dialog_Box_Simple_Mode.md`_

# Compare Configuration Dialog Box (Simple Mode)

This dialog box serves for visualizing differences between different versions of a configuration.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Load Configuration field: Contains the selected configuration. |  |
|  | Compare against field: Contains the selected configuration for comparison. |  |
|  | Compare against button: Opens the list with available configurations for comparison. | Ctrl + Shift + V |
|  | Result combo box: Filters the comparison results with the filter button. Saves entered values in a drop down list. |  |
|  | Result filter button: Starts filtering the Result table for values entered in the combo box. | Ctrl + F |
|  | Result drop down list: Filters the table on selection of a value. |  |
|  | Result table: Lists the detailed comparison results. |  |
|  | Report : Saves a comparison report as text file. | Alt + R |
|  | Close : Closes this dialog box. | ESC |

See also

[Comparing Configuration Versions](markdown/SCM_Comparing_Configuration_Versions.md)


---

## Compare Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Compare_Configuration_Dialog_Box.md`_

# Compare Configuration Dialog Box (Advanced Mode)

This dialog box serves for visualizing differences between different versions of a configuration.

##### Step 1 of 2

The first page of this dialog box provides an overview of the selected configuration version. You can select a different version in two different ways:

- Double-click on the configuration entry on this page, click the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_dots.gif) ... button in the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) and select a different revision number from the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md).
- Alternatively, right-click on the configuration entry, select Change Revision from the context menu and select the applicable revision number from the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Starts the comparison and displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the comparison operation.

##### Step 2 of 2

This page lists the local configuration content against the version you selected in Step 1 of 2. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md). You can right-click the table and use the [context menu](markdown/SCM_Context_Menu_for_the_Verify_Configuration_and_Compare_Configuration_Dialog_Boxes.md) to adjust the display.

Identical items are listed in black, invalid items are listed in blue, differences are color-coded (e.g., new items in green, different versions in red, etc.). The configuration itself is listed in italics.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the content of this dialog box to a log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Returns to the previous page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

See also

[Comparing Configuration Versions](markdown/SCM_Comparing_Configuration_Versions.md)


---

## Verify Configuration Dialog Box (Simple Mode)

_Source: `markdown/SCM_Verify_Configuration_Dialog_Box.md`_

# Verify Configuration Dialog Box (Simple Mode)

This dialog box serves for visualizing differences between different versions of a configuration.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Load Configuration field: Contains the selected configuration. |  |
|  | Compare against field: Contains the selected configuration for comparison. |  |
|  | Compare against button: Opens the list with available configurations for comparison. | Ctrl + Shift + V |
|  | Result combo box: Filters the comparison results with the filter button. Saves entered values in a drop down list. |  |
|  | Result filter button: Starts filtering the Result table for values entered in the combo box. | Ctrl + F |
|  | Result drop down list: Filters the table on selection of a value. |  |
|  | Result table: Lists the detailed comparison results. |  |
|  | Report : Saves a comparison report as text file. | Alt + R |
|  | Close : Closes this dialog box. | ESC |

See also

[Comparing Configuration Versions](markdown/SCM_Comparing_Configuration_Versions.md)


---

## Verify Configuration Dialog Box (Advanced Mode)

_Source: `markdown/SCM_VerifyConfiguration_DialogBox.md`_

# Verify Configuration Dialog Box (Advanced Mode)

This dialog box serves for visualizing differences between different versions of a configuration.

##### Step 1 of 2

The first page of this dialog box provides an overview of the selected configuration version. You can select a different version in two different ways:

- Double-click on the configuration entry on this page, click the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_dots.gif) ... button in the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) and select a different revision number from the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md).
- Alternatively, right-click on the configuration entry, select Change Revision from the context menu and select the applicable revision number from the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Starts the comparison and displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the comparison operation.

##### Step 2 of 2

This page lists the local configuration content against the version you selected in Step 1 of 2. See also: [Result Dialog Box](markdown/SCM_Result_Dialog_Box.md). You can right-click the table and use the [context menu](markdown/SCM_Context_Menu_for_the_Verify_Configuration_and_Compare_Configuration_Dialog_Boxes.md) to adjust the display.

Identical items are listed in black, invalid items are listed in blue, differences are color-coded (e.g., new items in green, different versions in red, etc.). The configuration itself is listed in italics.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the content of this dialog box to a log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Returns to the previous page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

See also

[Comparing Configuration Versions](markdown/SCM_Comparing_Configuration_Versions.md)


---

## Conflicts Found Dialog Box (Advanced Mode)

_Source: `markdown/SCM_Conflicts_Found_Dialog_Box.md`_

# Conflicts Found Dialog Box (Advanced Mode)

This dialog lists any conflict found during [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)various ASCET-SCM operations](javascript:void(0);), together with details about the nature of the conflict. For instance, a conflict may be reported via this dialog box if a different version of the same item(s) is already contained in ASCET.

| Column 1 | Column 2 |
| --- | --- |
| SCM operation | See also |
| Get Lock | Locking an Item |
| Release Lock | Unlocking an Item |
| Update | Updating Items |
| Update to Latest | Updating Items to Latest Revision |
| Update and Lock | Updating Items to Latest Revision and Locking an Item |
| Commit | Committing an Item |
| Checkout | Checking out Items |
| Edit without Lock | Editing Items in Offline Mode |
| Commit New Revision Without Lock |  |
| Get Lock for Configuration | Locking a Configuration |
| Release Lock for Configuration | Unlocking a Configuration |
| Update Configuration | Updating Configurations |
| Update to Latest Configuration | Updating Configurations to Latest Revision |
| Commit Configuration | Committing a Configuration |
| Checkout Configuration | Checking out a Configuration |

Critical conflicts are always shown. Conflicts that cause existing items to be overwritten in the ASCET database/workspace are only shown if the [Warn of Conflicts](markdown/SCM_Appearance_Options_for_ASCET-SCM.md#Warn_of_Conflicts) option is activated.

The Conflicts Found dialog box contains the following elements:

##### Elements with Conflicts list

Lists all ASCET elements that cause a conflict during the ASCET-SCM operation. You can right-click on the list to open the [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)context menu for the Conflicts Found dialog box](javascript:void(0);).

- Show Details

Displays the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) for the selected item.

- Delete Selection

Excludes the selected item from the operation.

- Reactivate Selection

Re-includes a removed item into the operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

Excludes the selected item from the operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

Re-includes a removed item into the operation.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log:

Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous

Returns to the previous display page (and thus to the previous step) in the operation.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next

Displays the next page of this dialog box.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <action>

This button continues the operation.

The name of this button depends on the operation you are performing. One possible name is, e.g., Checkout.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

Closes the dialog box and discards the operation.

See also

[Conflicts](markdown/SCM_Conflicts.md)


---

## Detailed Result Information Dialog Box

_Source: `markdown/SCM_Detailed_Result_Information_Dialog_Box.md`_

# Detailed Result Information Dialog Box

This dialog box provides an overview of the revision status of the currently selected item complete with an SCM result code and a message reporting the result oft the most recent operation performed on this item.

The << and >> buttons enable you to browse through the items listed in the Results dialog box.


---

## Details of <Item Name> Dialog Box

_Source: `markdown/SCM_Version_Details_Dialog_Box.md`_

# Details of <Item Name> Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md) and select [Properties](markdown/SCM_ASCET-SCM_Menu.md#Properties) or point to [Configuration Management](markdown/SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Show Configuration Properties. It is opened also when you double-click on an item in a selection dialog such as on the Step 2 of 4 page in the [[Checkout Dialog Box (Advanced Mode)](markdown/SCM_Checkout_Dialog_Box.md)](SCM_Online_versus_Offline_Mode.md)or the Step 2 of 5 page in the [Checkout Configuration Dialog Box (Advanced Mode)](markdown/SCM_Checkout_Configuration_Dialog_Box.md).

For configurations, <Item Name> includes (Configuration).

This dialog box enables you to

- View version information on the currently selected item.

And - if you have locked the item -

- In the Commentsarea, enter comments for the item.
- In the Labels area, specify a label for the item.
- In the Attributes area, [specify and edit attribute values](markdown/SCM_Edit_Attribute_Value_Dialog_Box.md) for the item.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_dots.gif) (next to the Revision or Configuration Revision field)

All available versions are shown for the current item. You can select the version to be loaded by clicking the "…" button.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_dots.gif) (next to the Repository field)

Click this button to select a new repository path.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) (next to the Labels field)

Adds / deletes a label to/from the labels list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) (next to the Attributes field)

Adds / deletes an attribute to/from the attributes list.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Element Data

Displays the [Item Details Dialog Box](markdown/SCM_Item_Details_Dialog_Box.md).

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Save & Close

Saves the current settings shown in this dialog box and then closes the dialog box.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

Closes this dialog box and discards any changes.


---

## Edit Attribute Value Dialog Box

_Source: `markdown/SCM_Edit_Attribute_Value_Dialog_Box.md`_

# Edit Attribute Value Dialog Box

This dialog box is displayed when you click the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image2.gif) button in the Attributes section of the [Details of <Item Name> dialog box](markdown/SCM_Version_Details_Dialog_Box.md) or when you double-click on an existing attribute name.

It enables you to specify and/or edit attribute values.

##### Attribute Name

Enables you to specify an attribute name. For existing attribute names, this field is set to read-only.

##### Attribute Value

Enables you to specify an attribute value.

##### Save

Saves your changes and closes the dialog box.

##### Cancel

Closes this dialog box and discards any changes.


---

## Item Details Dialog Box

_Source: `markdown/SCM_Item_Details_Dialog_Box.md`_

# Item Details Dialog Box

This dialog box is displayed when you click on the Element Data button in the [Details of <Item Name> dialog box (Advanced Mode)](markdown/SCM_Version_Details_Dialog_Box.md)or double-click on an item in the Selected Elements pane on the Step 1 of 4 page of the [Checkout (Advanced Mode)](markdown/SCM_Checkout_Dialog_Box.md) dialog box.

It displays the following information for the item:

- The element name of this item in the [repository](markdown/SCM_Repository.md).
- The element name of this item in ASCET.
- The ASCET path of this item.
- The current ASCET export version associated with this item.


---

## Items (Not) Under Source Control Dialog Box

_Source: `markdown/SCM_Items_under_Source_Control_Dialog_Box.md`_

# Items (Not) Under Source Control Dialog Box

This dialog box is displayed when you select Show Items (Not) Under Source Control from the [Show](markdown/SCM_ASCET-SCM_Menu.md#Show) submenu of the SCM menu.

If you use this command with a folder selection, all matching items in that folder and any subfolders are shown. If you use this command after multiple items have been selected, all matching items are listed in this dialog box.

This window is an instance of the ASCET [results window](ms-its:componentmanagerenglishus.chm::/CM_ResultsWindow.htm).


---

## Results Dialog Box

_Source: `markdown/SCM_Result_Dialog_Box.md`_

# Results Dialog Box

Lists the results of [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)various ASCET-SCM operations](javascript:void(0);). Depending on the current setting of the [Show Result Dialog](markdown/SCM_Appearance_Options_for_ASCET-SCM.md#Show_Result_Dialog) option, this dialog box is shown

| Column 1 | Column 2 |
| --- | --- |
| SCM operation | See also |
| Add and Commit | Adding and Committing an Item |
| Get Lock | Locking an Item |
| Release Lock | Unlocking an Item |
| Update | Updating Items |
| Update to Latest | Updating Items to Latest Revision |
| Update and Lock | Updating Items to Latest Revision and Locking an Item |
| Commit | Committing an Item |
| Checkout | Checking out Items |
| Edit without Lock | Editing Items in Offline Mode |
| Commit New Revision Without Lock |  |
| Delete | Deleting an Item from the Repository |
| Add and Commit New Configuration | Creating a Configuration |
| Get Lock for Configuration | Locking a Configuration |
| Release Lock for Configuration | Unlocking a Configuration |
| Update Configuration | Updating Configurations |
| Update to Latest Configuration | Updating Configurations to Latest Revision |
| Commit Configuration | Committing a Configuration |
| Checkout Configuration | Checking out a Configuration |

- always (i.e. after each ASCET-SCM operation),
- only in case of errors (i.e. if any items fail to load properly), or
- never.

The Results dialog box contains the following elements:

##### Results list

Lists the result of an ASCET-SCM operation. You can right-click on the list to filter this list via the [context menu for the Results dialog box](markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md).

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory:

The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close

Closes the Results dialog box.

See also

[Update Dialog Box](markdown/SCM_Update_Dialog_Box.md)

[Update to Latest Dialog Box](markdown/SCM_Update_to_Latest_DialogBox.md)

[Update Configuration Dialog Box](markdown/SCM_Update_Configuration_Dialog_Box.md)

[Update to Latest Configuration Dialog Box](markdown/SCM_Update_to_Latest_Configuration_Dialog_Box.md)


---

## Show Log / Configuration Log Dialog Box

_Source: `markdown/SCM_Show_Log_Dialog_Box.md`_

# Show Log / Configuration Log Dialog Box

This dialog box is displayed when you open the [SCM menu](markdown/SCM_ASCET-SCM_Menu.md) and select the [Show Log](markdown/SCM_ASCET-SCM_Menu.md#Show_Log) command or the Show Configuration Log command in the Configuration Management submenu.

These commands retrieve the current version or configuration history status of the selected items from the Subversion [repository](markdown/SCM_Repository.md).

If the Subversion driver is in "Offline" mode, this dialog box shows the history status which was read the last time a [Checkout](markdown/SCM_ASCET-SCM_Menu.md#Checkout), [Update](markdown/SCM_ASCET-SCM_Menu.md#Update) or [Update To Latest Revision](markdown/SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision) was performed on the selected item.

- For further details, you can double-click on entries listed in this dialog box.
- If a compare tool is installed and its installation path is specified via the [Custom Diff Tool](markdown/SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool) settings in the [Tool Options](markdown/SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool) dialog box for ASCET-SCM, you can compare a selected version entry in the list to the local status of the item in ASCET by clicking the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) button.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

Writes the content of the list shown in this dialog box to the log.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update Data

Updates the history data listed in this dialog box as well as in the ASCET database or workspace by applying the current content of the Subversion repository.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close

See also

[Online versus Offline Mode](markdown/SCM_Online_versus_Offline_Mode.md)

[Handling Configurations](markdown/SCM_Handling_Configurations.md)


---

## Context Menu for Selected Items

_Source: `markdown/SCM_Context_Menu_for_Selected_Items.md`_

# Context Menu for Selected Items

This menu is displayed when you right-click a selected item, e.g. on the Step 2 of 4 page of the Checkout Dialog Box.

##### Show Details

Displays the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) for the selected item.

##### Change Revision

Displays the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md) which enables you to select a different version of the selected item.

##### Delete Selection

Deletes the selected item from the [Checkout Dialog Box](markdown/SCM_Checkout_Dialog_Box.md).


---

## Context Menu for Added Items

_Source: `markdown/SCM_Context_Menu_for_Added_Items.md`_

# Context Menu for Added Items

##### Show Details

Displays the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) for the selected item.

##### Change Revision

Displays the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md) which enables you to select a different version of the selected item.

##### Change Folder

Displays the [Repository Selection Dialog Box](markdown/SCM_Repository_Selection_Dialog_Box.md) which enables you to select or create a repository folder for the selected item.

##### Delete Selection

Deletes the selected item from the [Checkout Dialog Box](markdown/SCM_Checkout_Dialog_Box.md).

See also

[Add and Commit](markdown/SCM_ASCET-SCM_Menu.md#Add_and_Commit)


---

## Context Menu for the Update and Commit Dialog Boxes

_Source: `markdown/SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md`_

# Context Menu for the Update and Commit Dialog Boxes

##### Show Details

Displays the [Details of <Item Name> Dialog Box](markdown/SCM_Version_Details_Dialog_Box.md) for the selected item.

##### Change Revision

Displays the [Select Revision Dialog Box](markdown/SCM_Select_Revision_Dialog_Box.md) which enables you to select a different version of the selected item.

##### Delete Selection

Deletes the selected item from the [Checkout Dialog Box](markdown/SCM_Checkout_Dialog_Box.md).

##### Compare with Local Status

Uses a diff tool such as ASCET-DIFF (specified through the [Custom Diff Tool](markdown/SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool) setting in the Tool Options dialog box for ASCET-SCM) to check the selected item version against the current local status.

See also

[Updating Items](markdown/SCM_Updating_Items.md)

[Update Dialog Box](markdown/SCM_Update_Dialog_Box.md)


---

## Context Menu for the Result Dialog Box

_Source: `markdown/SCM_Context_Menu_for_the_Result_Dialog_Box.md`_

# Context Menu for the Result Dialog Box

This menu is displayed when you right-click on an item following completion of the current ASCET-SCM operation.

##### Show Details

Displays the [Detailed Result Information Dialog Box](markdown/SCM_Detailed_Result_Information_Dialog_Box.md).

##### Show Errors Only

Lists only items for which the current ASCET-SCM operation failed to complete successfully.

##### Show Success Only

Lists only items on which the current ASCET-SCM operation was completed successfully.

##### Show Ignore Only

Lists only items that were ignored by the current ASCET-SCM operation.

##### Show All Results

Lists all results (success, error, and ignored) of the current ASCET-SCM operation.

##### Delete SCM Data in ASCET

Deletes SCM specific information for the selected item(s) in ASCET. A separate dialog box prompts you to confirm the deletion.


---

## Context Menu for the Verify Configuration and Compare Configuration Dialog Boxes

_Source: `markdown/SCM_Context_Menu_for_the_Verify_Configuration_and_Compare_Configuration_Dialog_Boxes.md`_

# Context Menu for the Verify Configuration and Compare Configuration Dialog Boxes

This menu is displayed when you right-click on the results lists of one of these two dialog boxes.

##### Differences

Lists only the items that differ in the two lists.

##### Missing Items

Lists only the items that occur in one of the two lists but not in the other.

##### Show All

Resets the filters described above.


---

## Frequently Asked Questions

_Source: `markdown/SCM_FAQs.md`_

# Frequently Asked Questions

| Column 1 | Column 2 |
| --- | --- |
| Q | I want to use ASCET-SCM "on the road" - in a mobile use case. How do I proceed? |
| A | See Online versus Offline Mode and Editing Items in Offline Mode . |
|  |  |
| Q | I have to import an item by using File , Import but a different version of this item is already contained in the Subversion repository. How do I handle this item in ASCET-SCM? |
| A | See: Special Use Case: Handling Imported Components . |
|  |  |
| Q | Is checking out in ASCET-SCM the same as checking out in TortoiseSVN? |
| A | No; unlike TortoiseSVN, the Checkout command in ASCET-SCM does not automatically read a complete repository to a new folder, but shows the complete repository content in the Checkout Dialog Box. See also: Checking out in ASCET-SCM versus Checking out in TortoiseSVN . |
|  |  |
| Q | I want to add new configurations to version control. Should I simply add the entire folder in which these configurations are contained? |
| A | You are recommended to use Add and Commit New Configuration for an individual configuration (see Creating a Configuration ) but not for a folder. If you apply this command at a folder level, each item within this folder will receive its own configuration. See also: Managing ASCET Folders . |
|  |  |
| Q | What happens when I unlock an item or configuration? |
| A | Once you have unlocked an item or configuration, it is available for locking by other users and your local modifications may be thus be undone. That's why ASCET-SCM will issue a warning message when you unlock locally modified items or configurations. To preserve your modifications under version control, select Commit or Commit Configuration . See also: Locking and Unlocking . |
|  |  |
| Q | I want to edit an item in ASCET and save it as a new version, even though the SCM repository contains a newer item version (which is "skipped"). How do I proceed? |
| A | Proceed as follows: Use Checkout or Update to load the item version you want to edit. Use Edit without Lock to edit the selected item version in offline mode. Use Commit New Revision without Lock to preserve your modifications under version control. Answer the warning message "... More recent versions exist in repository ... Do you want to continue?" with Yes . |
|  |  |

See also

[Version Handling Based on Subversion](markdown/SCM_Version_Handling_based_on_Subversion.md)


---

## Glossary

_Source: `markdown/Glossary.md`_

# Glossary

[CC](javascript:void(0);)

ClearCase

[Check-out](javascript:void(0);)

This term describes the act of reading from a repository. Subversion uses the term "update" instead.

[Commit](javascript:void(0);)

This Subversion term describes the act of writing to a repository. In other SCM systems, this is referred to as "check-in" or "save".

[Configuration](javascript:void(0);)

Control mechanism for dependencies of item versions (used for tasks such as handling delivery packages or entire ECU projects).

[CVS](javascript:void(0);)

CVS is a robust, open-source version control system from CVS Corporation.

[Edition](javascript:void(0);)

Editable item that is controlled within an SCM tool. This term is used to distinguish revisions that are currently being edited by one user.

[Lock](javascript:void(0);)

Subversion term used for "reserving" revisions by users that want to edit a controlled item. A "locked" item can only be edited by the user who has locked it; no other users can edit the locked item at the same time.

[Log](javascript:void(0);)

This Subversion term describes the reading of history for repository contents (other similar SCM term: show history).

[MSSCCI](javascript:void(0);)

The Microsoft Source Code Control Interface (MSSCCI) is a de-facto standard which sets up a communication bridge between an IDE (e.g. ASCET, Visual Studio .Net, etc.) and a corresponding SCM tool.

[OID](javascript:void(0);)

Object ID. ASCET uses a unique internal identity for each database item. It cannot be defined, changed or seen by the user but is used by ASCET-SCM and other external interfaces to handle ASCET items.

[Repository](javascript:void(0);)

Database where files are stored and managed by the SCM tool. In some SCM tools, this is also called "archive".

[Revision](javascript:void(0);)

A defined status of a file in a repository, stored with a defined identity. In Subversion, this term is used as a synonym for "version".

[SCM](javascript:void(0);)

Source Configuration Management, a general term for versioning of software elements and their relationships.

[Subversion](javascript:void(0);)

The goal of the Subversion project is to build a version control system that is a compelling replacement for CVS in the open source community. The software is released under an Apache/BSD-style open source license.

[SVN](javascript:void(0);)

Stands for Subversion

[Update](javascript:void(0);)

This Subversion term describes the act of reading from a repository. In other SCM systems, this is referred to as "check-out" or "get" or "load".

[Version](javascript:void(0);)

A synonym for "revision".

[VSS](javascript:void(0);)

Visual SourceSafe


---

