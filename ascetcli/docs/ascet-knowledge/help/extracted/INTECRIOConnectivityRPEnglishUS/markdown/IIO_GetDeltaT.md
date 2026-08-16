# GetDeltaT

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
<col style="width: 100px;"/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1">
<p class="tablehead">GetDeltaT</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Returns the value of dT.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">TickType GetDeltaT(void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode" style="font-weight: bold;">GetDeltaT()</span> 
 returns the time expired between two subsequent task executions.</p>
<p class="note">If this time exceeds half the width of the hardware timer, 
 the return value can not be relied on.</p>
<p class="tabledefault">This function is only supported in ERCOSEK debug 
 mode. See chapter "Debug information within the task monitor" 
 in the ERCOSEK manual for detailed information about debugging an application 
 based on ERCOSEK.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Value of dT in ticks.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">TickType deltaT;</p>
<p class="code">deltaT = <span class="gui">GetDeltaT()</span>;</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">---</p></td></tr>
</table>
