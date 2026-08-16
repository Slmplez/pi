# wdSetPeriod

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
<p class="tablehead">wdSetPeriod</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the Watchdog Period.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">uint32 wdSetPeriod(uint32 period)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function switches the watchdog period (time 
 period after that the watchdog expires) which can be configured in the 
 range from 0.25 ms up to 4096 ms.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="4" style="width:100px;" width="100px">
<p class="tabledefault">Return value</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_SUCCESS</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_SAFETY_MODE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is in safety mode. No period modification 
 possible.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_INVALID_ARG</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Invalid period value</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_CFW_WD_PRE_OP_MODE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is in pre-operational mode. Switch first 
 to RSEF mode.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault">Parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">period</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_4096MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_1024MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_256MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_64MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_16MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_4MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_1MS</span></p>
<p class="tabledefault"><span class="emphasiscode">WD_PERIOD_0_25MS</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 period;</p>
<p class="code">uint32 retVal;</p>
<p class="code">period = WD_PERIOD_4096MS;</p>
<p class="code">retVal =<span class="gui"> wdSetPeriod</span>(period);</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetSafetyMode.md">wdSetSafetyMode</a>, 
 <a href="IIO_wdSetEvent.md">wdSetEvent</a></p></td>
</tr>
</table>
