# Dimensions, Scopes, and Data Types (Basic Blocks)

For each element type available, there are various dimensions, scopes, and data types. The possible combinations are listed below.

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
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<col style="width: 40px;"/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p align="right" class="tablehead" style="text-align: right;">Combinations</p></td>
<td class="hcp2" colspan="3" rowspan="1" style="width:120px;" width="120px">
<p class="tabledefaultcenter">dimension</p></td>
<td class="hcp2" colspan="2" rowspan="1" style="width:80px;" width="80px">
<p class="tabledefaultcenter">scope</p></td>
<td class="hcp2" colspan="7" rowspan="1" style="width:160px;" width="160px">
<p class="tabledefaultcenter">data type</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Elements</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">scalar</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">array</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">record</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">local</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">global</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">logic</p></td>
<td class="hcp2" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">sdisc</p></td>
<td class="hcp2" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">udisc</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefaultcenter">limitInt</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefault">wrapInt</p></td>
<td class="hcp2" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefault">cont</p></td>
<td class="hcp2" style="width:40px;" width="40px">
<p class="tabledefault">enum</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">input</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">output</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">discrete state</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">continuous state</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">steplocal variable</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">parameter</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">dependent parameter</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">constant</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">continuous variable</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault">characteristic line/map</p></td>
<td class="hcp3" colspan="3" rowspan="1" style="width:120px;" width="120px">
<p class="tabledefaultcenter">n/a</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp3" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp4" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp6" colspan="1" rowspan="1" style="width:40px;" width="40px">
<p class="tabledefaultcenter">x</p></td>
<td class="hcp5" style="width:40px;" width="40px">
<p class="tabledefaultcenter"> </p></td></tr>
</table>

See also

[Inputs](CTB_Inputs.md)

[Outputs](CTB_Outputs.md)

[Continuous State](CTB_Continuous_State.md)

[Discrete State](CTB_Discrete_State.md)

[Steplocal Variables](CTB_Steplocal_Variables.md)

[Parameters](CTB_Parameters.md)

[Dependent Parameters](CTB_Dependent_Parameters.md)

[Constants](CTB_Constants.md)

[Scalar Types - Summary](IntroductionEnglishUS.chm::/INT_scalar_summary.htm)
