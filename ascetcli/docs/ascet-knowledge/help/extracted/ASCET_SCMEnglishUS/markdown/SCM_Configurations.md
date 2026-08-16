# Configurations

Configurations are sets of logically related components. ASCET-SCM enables you to store and retrieve such configuration under version control. Note that a configuration may contain elements at different revision levels; however, a configuration must not contain different revisions of the same element.

##### Multi-User Support for Configurations

Unlike ASCET item contents, configuration contents can always be changed. There is no write-protection mechanism in ASCET for configurations. You can change a configuration either by changing the base item of the configuration or by changing any referenced item.

Just like an item, you can lock a configuration in order to edit it. The methodology uses commands similar to those provided for items. However, even if you did not lock a configuration before committing a new revision, the commit will be executed; ASCET-SCM automatically locks the configuration prior to the commit. If the same configuration is locked by another user, the commit will fail and ASCET-SCM will issue an associated message.

If the same configuration or an included item is [locked](SCM_Locking_and_Unlocking.md) by another user, the [commit](SCM_Committing.md) will fail and ASCET-SCM will issue an associated message.

##### States of ASCET Configurations Controlled by means of Subversion

Similar to item revision states, configuration states are visualized by overlay icons in ASCET-SCM. The state icons for configurations are shown behind revision state icons and have the same meaning for configuration states as for revision states.

Example:

ASCET project "p1" is stored as revision 37, currently locked and modified in ASCET. A configuration of "p1" was also stored (last updated or committed in revision 39 which is not locked and might not be valid any more). This state is displayed within the ASCET database or workspace in the following way:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/icon_project.gif)

See also

[Handling Configurations](SCM_Handling_Configurations.md)
