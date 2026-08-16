# Copying Database/Workspace Items and Structures

You can copy database/workspace items or entire folders and their contents. When the target directory contains an object with the same name as the original, the extension 1 is added to the name of the copied object.

When items or folders are moved within the same database/workspace, item and/or folder names are usually retained in the target folder. The new item is automatically renamed only if the target folder already contains an item or a folder with the same name, thus avoiding naming conflicts.

If you want to re-implement an existing component as another item type (e.g., a block diagram component in C code or ESDL), you can use the Reproduce As command to copy the structure of the original component, so you will not have to specify it again. When you copy the structure of a component, the entire interface of the component is created automatically in the target component.

The table lists the components that can be reproduced, and the available item types for each (+: available, -: not available).

<table style="margin-top: 3px;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				x-cell-content-align: Bottom;" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td colspan="2" rowspan="2" style="padding-top: 2px;
			padding-bottom: 2px;
			border-left-style: Inset;
			border-top-style: Inset;
			border-right-style: Inset;
			border-bottom-style: Inset;
			padding-left: 2px;
			padding-right: 2px;
			border-left-width: 1px;
			border-top-width: 1px;
			border-right-width: 1px;
			border-bottom-width: 1px;
			x-cell-content-align: bottom;" valign="bottom">
<p class="tableheadeng">Component to be reproduced</p></td>
<td class="hcp2" colspan="6" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: center;">Can be reproduced as</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Block Diagram</p></td>
<td class="hcp2">
<p class="tableheadeng">C Code</p></td>
<td class="hcp2">
<p class="tableheadeng">ESDL</p></td>
<td class="hcp2">
<p class="tableheadeng">Record</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">SenderReceiver<br/>
Interface</p></td>
<td class="hcp2">
<p class="tableheadeng">NVData<br/>
Interface</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="3">
<p class="tableheadeng">Module</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p>Block Diagram</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">C Code</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">ESDL</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="3">
<p class="tableheadeng">Class</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Block Diagram</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">C Code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">ESDL</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="3">
<p class="tableheadeng">CT block</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Block Diagram</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">C Code</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">ESDL</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1">
<p class="tableheadeng">Boolean Table</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1">
<p class="tableheadeng">Conditional Table</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1">
<p class="tableheadeng">Record</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">-</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">+</p></td></tr>
</table>

See also

[C](CopyDatabase.md)opying a Folder or Item

[Cutting a Folder or Item](CM_CutInsert.md)

[Inserting a Folder or Item](InsertDatabase.md)

[Deleting a Folder or Item](CM_DeleteCopy.md)

[Copying the Structure of a Component](CM_CopySave.md)
