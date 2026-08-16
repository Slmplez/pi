# wdSetEvent

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
<p class="tablehead">wdSetEvent</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the event to be handled, if the watchdog expires.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">int32 wdSetEvent(uint32 event)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">The function selects the action which should be done 
 when the watchdog expires.</p>
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_DISABLE</span> 
 disables the watchdog.</p>
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_PPC750_RESET</span> 
 resets the IBM 750GX simulation processor.</p>
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_PPC750_INT</span> 
 triggers an interrupt to the simulation processor. </p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault">Return value</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_SUCCESS</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_SAFETY_MODE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is in safety mode. No event modification 
 possible.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_INVALID_ARG</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Invalid event value</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_PRE_OP_MODE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is in pre-operational mode. Switch first 
 to RSEF mode.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">event</p></td>
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_DISABLE</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_PPC750_RESET</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_EVENT_PPC750_INT</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 event;</p>
<p class="code">uint32 retVal;</p>
<p class="code">event = WD_EVENT_DISABLE;</p>
<p class="code">retVal = <span class="gui">wdSetEvent</span>(event);</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetSafetyMode.md">wdSetSafetyMode</a>, 
 <a href="IIO_wdSetPeriod.md">wdSetPeriod</a></p></td>
</tr>
</table>
