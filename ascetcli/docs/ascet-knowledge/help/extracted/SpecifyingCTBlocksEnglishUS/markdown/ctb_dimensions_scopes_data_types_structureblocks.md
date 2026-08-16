# Dimensions, Scopes, and Data Types (Structure Blocks)

Each type of element has a certain dimension, a scope of validity, and a type. The possible combinations are illustrated in the table below.

<table style="x-cell-content-align: Top;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				margin-top: 6px;" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p align="right" class="tablehead" style="text-align: right;">combinations</p></td>
<td class="hcp2" colspan="3" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">dimension</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">scope</p></td>
<td class="hcp2" colspan="7" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">data type</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tablehead">elements</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">scalar</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">array</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">record</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">local</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">global</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">logic</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">sdisc</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">udisc</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">limitInt</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">wrapInt</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">cont</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">enum</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">input</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">output</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">global parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">constant</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">char. line/map</p></td>
<td class="hcp2" colspan="3" rowspan="1">
<p class="tabledefaultcenter">n/a</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefault" style="text-align: center;"> </p></td></tr>
</table>

see also

[Summary - Structure Block Interfaces](CTB_Summary_Structure_Block_Interfaces.md)

[Inputs](CTB_Inputs.md)

[Outputs](CTB_Outputs.md)

[Global Parameters](CTB_Global_Parameters.md)

[Constants](CTB_Constants.md)

[Scalar Types - Summary](IntroductionEnglishUS.chm::/INT_scalar_summary.htm)
