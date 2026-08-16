# Handling Imported Components

If you use File, Import to import a version of a component (item or configuration) and an older version of the same component is already included in the Subversion repository, proceed as follows:

1. In the ASCET component manager, select the imported item or configuration.
1. If the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24.gif)icon marks the component as modified, select [Commit](SCM_Committing_an_Item.md) or [Commit New Revision without Lock](SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.
1. If the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image34.gif)icon marks the component as invalid, (i.e. the existing component was not editable at the time of the import), select [Commit New Revision without Lock](SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.

See also

[Version Handling Based on Subversion](SCM_Version_Handling_based_on_Subversion.md)

[Special Use Case: Handling Imported Components](SCM_Special_Use_Case__Handling_Imported_Components.md)

[What Happens to the OID when a New Version of a Component is Imported?](SCM_Special_Use_Case__Handling_Imported_Components.md#What_Happens_to_the_OID_when_a_New_Version_of_a_Component_is_Imported_)
