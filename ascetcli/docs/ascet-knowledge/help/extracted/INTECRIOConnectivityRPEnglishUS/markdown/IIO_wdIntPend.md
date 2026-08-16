# wdIntPend

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
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="3" rowspan="1">
<p class="tablehead">wdIntPend</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Checks if interrupt is pending.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint8 wdIntPend(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function checks, if a watchdog interrupt is 
 pending. Use <span class="emphasiscode">wdSetEvent()</span> in advance to 
 map the watchdog event accordingly.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2" style="width:100px;" width="100px">
<p class="tabledefault">Return value</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">false</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">No watchdog interrupt is pending.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">true</p></td>
<td class="hcp2">
<p class="tabledefault">Watchdog interrupt is pending.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">if(<span class="gui">wdIntPend()</span> == true)</p>
<p class="code">{</p>
<p class="code3">intPollCount++;</p>
<p class="code3">/* Reset Interrupt */</p>
<p class="code3">wdIntAck();</p>
<p class="code">}</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetEvent.md">wdSetEvent</a>, <a href="IIO_wdIntDisable.md">wdIntDisable</a>, 
 <a href="IIO_wdIntAck.md">wdIntAck</a></p></td>
</tr>
</table>
