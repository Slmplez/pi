# Special Use Case: Handling Imported Components

ASCET-SCM enables you to import a new version of a component that is already under version control in the Subversion repository.

- If the existing version of the component is editable at the time of the import (i.e. if [Edit without Lock](SCM_Editing_Items_in_Offline_Mode.md) or [Get Lock](SCM_Locking_an_Item.md) was performed on the component prior to the import), the newly imported content overwrites the existing content of the component, and the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24.gif)icon marks the component as modified. You can then apply [Commit](SCM_Committing_an_Item.md) or [Commit New Revision without Lock](SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.
- If the existing version of the component is not editable at the time of the import, the newly imported content overwrites the existing content of the component, and the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/image34.gif)icon marks the component as invalid. You can then apply [Commit New Revision without Lock](SCM_Editing_Items_in_Offline_Mode.md#CommitNewRevisionwithoutLock) to check in the component.

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

[Handling Imported Components](SCM_Handling_Imported_Components.md)

[Overlay icons](SCM_Overlay_Icons.md)
