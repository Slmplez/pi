# wdSetReducedSafetyMode

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
<p class="tablehead">wdSetReducedSafetyMode</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the Reduced Safety Enhanced Function Mode.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 wdSetReducedSafetyMode(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function switches from the pre-operational mode 
 to the reduced safety enhanced function mode (RSEF).</p>
<p class="note">This function is already called inside the boot loader. Thus, 
 this API function has no impact for use of the INTECRIO connectivity, 
 because the model starts with the watchdog in RSEF mode.<br/>
The loader disables also the watchdog events. Afterwards, watchdog period 
 and event can be modified via wdSetPeriod and wdSetEvent.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="3" style="width:100px;" width="100px">
<p class="tabledefault">Return value</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_SUCCESS</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_SAFETY_MODE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is in safety mode. This cannot be undone.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_RSEF_MODE</p></td>
<td class="hcp2">
<p class="tabledefault">Watchdog is already in RSEF mode.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">---</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetPeriod.md">wdSetPeriod</a>, <a href="IIO_wdSetEvent.md">wdSetEvent</a></p></td>
</tr>
</table>
