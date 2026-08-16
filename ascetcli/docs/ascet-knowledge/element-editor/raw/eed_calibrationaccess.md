# Calibration Access

Beginning with V6.2, ASCET allows a three-step configuration of calibration access to elements. In non-AUTOSAR projects, information on calibration access is required for the ASAM-MCD-2MC (*.a2l) generation. In AUTOSAR projects, this information is required for the generation of the AUTOSAR descriptions (*.arxml files).

The following calibration access settings are available:

- no access (in AUTOSAR R4: NotAccessible)

- read-only (in AUTOSAR R4: ReadOnly)

Read-only access is available for variables, parameters, and system constants.

- read/write (in AUTOSAR R4: ReadWrite)

Read/write access is available for parameters and system constants.

If a variable has read-only access, it will be included in the *.a2l file and get the keyword READ_ONLY. If the read-only access of the variable is disabled, i.e. the variable is set to no access, it will not be included in the *.a2l file.

If a parameter has read/write access, it will be included in the *.a2l file. If write access is disabled, i.e. the parameter has read-only access, it will be included in the *.a2l file and get the keyword READ_ONLY. If even the read-only access is disabled, i.e. the parameter is set to no access, it will not be included in the *.a2l file.

When you open an older database/workspace, or import older models in ASCET V6.2, the two-step calibration access setting (calibration activated or deactivated) of previous ASCET versions is migrated to the three-step configuration as follows:

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
<col/>
<col/>
<tr class="hcp1" valign="top">
<td colspan="1" rowspan="2" style="padding-top: 2px;
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
<p class="tablehead">old calibration setting</p></td>
<td class="hcp2" colspan="4" rowspan="1">
<p class="tabledefaultcenter"><span class="gui">new calibration settings</span></p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">variables</p></td>
<td class="hcp2">
<p class="tablehead">parameters</p></td>
<td class="hcp2">
<p class="tablehead">system constants</p></td>
<td class="hcp2">
<p class="tablehead">constants</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">activated</p></td>
<td class="hcp2">
<p class="tabledefault">read</p></td>
<td class="hcp2">
<p class="tabledefault">read + write</p></td>
<td class="hcp2">
<p class="tabledefault">read + write</p></td>
<td class="hcp2">
<p class="tabledefault">no access</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">deactivated</p></td>
<td class="hcp2">
<p class="tabledefault">no access</p></td>
<td class="hcp2">
<p class="tabledefault">read</p></td>
<td class="hcp2">
<p class="tabledefault">read</p></td>
<td class="hcp2">
<p class="tabledefault">no access</p></td></tr>
</table>

See also

[Editing the Calibration Access](EEd_EditCalibrationAccess.md)
