# Import of Folders and Database/Workspace Items

Every object in an ASCET database or workspace has a unique identity tag, and is known to the database/workspace only by this identity tag. Database/workspace items reference each other only on the basis of these tags, not on the basis of the names displayed in the Component Manager.

You can import from one or more export files of the following formats into your database.

<table style="x-cell-content-align: Top;
				margin-top: 3px;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;" x-use-null-cells="">
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">Binary export file (see <a href="CM_Binary_Export.md">Binary 
 Export</a>)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ASCET Export files (<span class="gui">*.exp,*.prj</span>)</p></td>
<td class="hcp2">
<p class="tabledefault"> </p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">AMD export file (see <a href="CM_AMD_Export.md">AMD 
 Export</a>) </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ASCET Model Data files (<span class="gui">*.main.amd</span>, 
 <span class="gui">*.main.xml</span>)</p></td>
<td class="hcp2" colspan="1" rowspan="2">
<p class="tabledefault">see also <a href="cm_special_features_of_the_amd_import.md">Special 
 Features of the AMD/AXL Import</a></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">compressed AMD export file</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ASCET compressed Model Data files (<span class="gui">*.axl,*.zip</span>)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">AUTOSAR component description files</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">AUTOSAR XML files (<span class="gui">*.arxml</span>) 
 </p></td>
<td class="hcp2">
<p class="tabledefault">see also <a href="CM_SpecialFeatures_ARXMLImport.md">Special 
 Features of the ARXML Import</a></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">ASAM-MCD-2MC project</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ASAP2 files (<span class="gui">*.a2l</span>)</p></td>
<td class="hcp2">
<p class="tabledefault"> </p></td></tr>
</table>

When you are using a workspace, you cannot use the binary export format for import.

The folders and items required are created automatically. You are prompted for confirmation when an existing item is overwritten by an imported item.

Besides the components themselves, the export files also store the component paths in the exporting database/workspace. If an imported item is located in a folder existing in the target database/workspace, it is written into that folder. If an item is located in a folder in the source database/workspace that does not exist in the target database/workspace, the folder is automatically created. If necessary, several levels of folders are created. The folder hierarchy is recreated as it exists in the source database/workspace.

When an item is imported that already exists in the target database/workspace, the existing item is overwritten, unless it is protected (see [Disallowing Overwriting of Items](Disallowoverwriting.md)). Renaming offers no protection against overwriting because items are identified by their object IDs or UUIDs, not their names.

With ARXML import, the import option Use UUIDs for Identification ensures that, if no OIDs are available, UUIDs are used instead of names to identify components in the database/workspace.

If an imported item overwrites an existing item, the behavior of existing implementations can be specified in the [import options](CM_Import_Node.md). When you activate the Discard Existing Implementations option, all existing implementations are replaced by imported implementations. To keep existing implementations, Discard Existing Implementations must be deactivated.

With EXP import, you can specify the target database path for an imported item overwriting an existing item. When you deactivate the Keep Folder Path of Components option, the imported item is stored at the export database path, even in case it is stored in a different folder in the target database. To keep the existing path name, Keep Folder Path of Components has to be activated.

Before you import folders or items, set the [import options](CM_Import_Node.md) in the ASCET options.

You can

[I](CM_Importing_from_AMD_AXL_Files.md)mport from AMD/AXL files

[Import from binary export files](CM_ImportBinaryFiles.md)

[Import from ARXML or A2L files](CM_Import_ARXML_or_A2L_Files.md)

[Use the AUTOSAR to ASCET Converter](CM_Use_A2AConverter.md)

[Disallow overwriting of Items](Disallowoverwriting.md)

See also

[Import of a Directory Content](ImportingDirectory.md)

[Importing Projects](ImportingProjects.md)

[Import Options](CM_Import_Node.md)

[Binary Export](CM_Binary_Export.md)

[AMD Export](CM_AMD_Export.md)

[Other Export Formats](CM_Other_Export_Formats.md)
