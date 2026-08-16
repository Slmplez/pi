# Kind of Elements - Summary

Each element has a kind. The kind of an element describes how the element is used, either as a variable, a parameter, a system constant or constant. Implementation-Casts are another kind.

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
|  | Model | Experiment / Calibration Tool | Implementation |
| variable | r-w | r-w | yes |
| parameter | r | r-w | yes |
| system constant | r | r | yes |
| constant | r | r | no |
| implementation cast | — | — | yes |

The kinds of elements, as well as the properties listed in the table below, are marked by certain symbols in various ASCET windows.

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;"> </p></td>
<th class="hcp4" colspan="3" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">Scope</p></th>
<th class="hcp4" colspan="1" rowspan="2">
<p class="tablehead"><a href="INT_dependent_parameters.md">dependent</a></p>
</th>
<th class="hcp4" colspan="1" rowspan="2">
<p class="tablehead"><a href="INT_virtual_variables_parameters.md">virtual</a></p>
</th>
<th class="hcp4" colspan="1" rowspan="2">
<p class="tablehead">non-volatile</p></th></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tablehead"> </p></td>
<td class="hcp3">
<p class="tablehead">imported</p></td>
<td class="hcp3">
<p class="tablehead">exported</p></td>
<td class="hcp3">
<p class="tablehead">local</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><a href="INT_variables.md">variable</a><span class="hcp5">a</span></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_msgimport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_msgexport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_msglocal.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_varvirtualimp.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_varvirtualex.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_varvirtual.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_varNVimport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_varNVexport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_varNVlocal.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><a href="INT_parameters.md">parameter</a><span class="hcp5">b</span></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_parimport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_parexport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_parlocal.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_pardepend.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_parvirtimp.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_parvirtex.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_parvirt.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><a href="INT_constants_and_system_constants.md">constant 
 / system constant</a></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_constimport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_sysconstimport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_constexport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_sysconstexport.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_constlocal.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/>/<img border="0" class="hcp6" height="16" src="symbol_sysconstlocal.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault"><a href="INT_implementation_casts.md">implementation 
 cast</a></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_implcast.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault"><a href="INT_dt_parameter.md">dT</a></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="16" src="symbol_dt.gif" style="width:16px; height:16px;" width="16" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"><img border="0" class="hcp6" height="14" src="symbol_dtEx.gif" style="width:14px; height:14px;" width="14" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="7" rowspan="1">
<p class="tabledefault">a: including arrays, matrices and enumerations</p>
<p class="tabledefault">b: including characteristic line/map, distribution</p></td>
</tr>
</table>

Beginning with ASCET V6.4, scope and the other properties are no longer displayed for messages. Instead, the message type (Send, Receive, Send & Receive) is marked by certain symbols in various ASCET windows.

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
|  | Send | Receive | Send & Receive |
| message |  |  |  |

-----
