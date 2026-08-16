# GetSystemTimeLow

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
<p class="tablehead">GetSystemTimeLow</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Gets the low-order part of the current system time.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">TickType GetSystemTimeLow(void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode" style="font-weight: bold;">GetSystemTimeLow()</span> 
 returns the low-order part of the current system time in ticks. These 
 are the lower 16 bit for an ERCOSEK implementation with a 32 bit wide 
 system time; for an implementation with a 64 bit wide system time, the 
 lower 32 bit.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Low-order part of the current system time.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">TickType lowPartOfNow;</p>
<p class="code">lowPartOfNow = <span class="gui">GetSystemTimeLow()</span>;</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><a href="IIO_GetSystemTime.md">GetSystemTime</a>, 
 <a href="IIO_GetSystemTimeHigh.md">GetSystemTimeHigh</a></p></td></tr>
</table>
