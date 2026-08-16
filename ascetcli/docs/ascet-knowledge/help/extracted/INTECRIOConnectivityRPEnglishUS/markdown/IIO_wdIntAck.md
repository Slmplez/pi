# wdIntAck

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
<p class="tablehead">wdIntAck</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Acknowledges Watchdog interrupt.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">void wdIntAck(void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">This function acknowledges a Watchdog interrupt. 
 The Watchdog counter (automatic restart after triggering an event) is 
 not influenced by this call. If the Watchdog counter should be initialized, 
 use <span class="emphasiscode">wdService()</span> before.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">if(wdIntPend() == true)</p>
<p class="code">{</p>
<p class="code3">intPollCount++;</p>
<p class="code3">/* Reset Interrupt */</p>
<p class="code3"><span class="gui">wdIntAck()</span>;</p>
<p class="code">}</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetEvent.md">wdSetEvent</a>, <a href="IIO_wdIntDisable.md">wdIntDisable</a>, 
 <a href="IIO_wdIntPend.md">wdIntPend</a></p></td></tr>
</table>
