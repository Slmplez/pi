# wdDisableAutoService

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
<p class="tablehead">wdDisableAutoService</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">Disables automatic servicing.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code">void wdDisableAutoService(void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">This function disables the watchdog automatic servicing 
 feature.</p>
<p class="note">It is up to the model to service the watchdog accordingly. 
 Please keep in mind, that disabling automatic servicing disables also 
 RTIO internal servicing calls. Because RTIO driver calls (especially driver 
 Init and Exit) potentially block for longer times, automatic servicing 
 should be enabled inside the Init and Exit task.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code"><span class="gui">wdDisableAutoService()</span>;</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault"><a href="IIO_wdService.md">wdService</a>, <a href="IIO_wdEnableAutoService.md">wdEnableAutoService</a></p></td></tr>
</table>
