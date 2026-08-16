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

The Subversion menu operations for loading ASCET items ([Checkout](SCM_ASCET-SCM_Menu.md#Checkout), [Update](SCM_ASCET-SCM_Menu.md#Update), …) result in these items being write-protected by default. Also, after you add a new item to the Subversion repository, or after you store a new revision, the item will be in write-protected state.

To make changes to ASCET items, you need to lock these items. Items that are currently locked by another user are marked as Rev_ExternLock. If you don't want an item change to result in a new revision (e.g. if you just want to try out something without storing the result), you can remove the write-protection by selecting Edit without Lock from the [Additional Commands](SCM_ASCET-SCM_Menu.md#Additional_Commands) submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu.

##### Overlay Icons

ASCET-SCM indicates the current state of an item or configuration through the applicable [overlay icon](SCM_Overlay_Icons.md).

For further information on Subversion, visit [http://subversion.apache.org/](http://subversion.apache.org/).

See also

[ASCET-SCM Architecture](SCM_ASCET-SCM_Architecture.md)

[Typical Workflow - Using Subversion for Revision Control](SCM_Typical_Workflow_-_Using_Subversion_for_Revision_Control.md)

[Importing Data from the Subversion Repository](SCM_Importing_Data_from_the_Subversion_Repository.md)

[Special Use Case: Handling Imported Components](SCM_Special_Use_Case__Handling_Imported_Components.md)
