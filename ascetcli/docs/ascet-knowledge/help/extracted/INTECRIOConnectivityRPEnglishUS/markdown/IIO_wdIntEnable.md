# wdIntEnable

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
<p class="tablehead">wdIntEnable</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">Enables Watchdog interrupt handling.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code">void wdIntEnable(void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault">This function enables the watchdog interrupt handling. 
 Use <span class="emphasiscode">wdSetEvent()</span> in advance to map the 
 watchdog event accordingly. <span class="emphasiscode" style="font-weight: bold;">The wdIntEnable()</span> 
 call has only influence on the interrupt propagation. <span class="emphasiscode" style="font-weight: bold;">wdIntPend()</span> 
 can be used even if the watchdog interrupt is disabled.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="code">wdIntEnable();</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="8">
<p class="tabledefault"><a href="IIO_wdSetEvent.md">wdSetEvent</a>, <a href="IIO_wdIntPend.md">wdIntPend</a>, 
 <a href="IIO_wdIntDisable.md">wdIntDisable</a>, <a href="IIO_wdIntAck.md">wdIntAck</a></p></td></tr>
</table>
