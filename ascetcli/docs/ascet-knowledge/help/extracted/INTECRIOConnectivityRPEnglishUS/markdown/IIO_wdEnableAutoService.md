# wdEnableAutoService

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
<col style="width: 8px;"/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1" width="108">
<p class="tablehead">wdEnableAutoService</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">Enables automatic servicing.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code">void wdEnableAutoService (void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">This function enables the watchdog automatic servicing 
 feature. It services the watchdog in 30 ms intervals, if interrupts are 
 enabled. Additional servicing may be done by RTIO device drivers. The 
 servicing is enabled by default.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code"><span class="gui">wdEnableAutoService()</span>;</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault"><a href="IIO_wdService.md">wdService</a>, <a href="IIO_wdDisableAutoService.md">wdDisableAutoService</a></p></td></tr>
</table>
