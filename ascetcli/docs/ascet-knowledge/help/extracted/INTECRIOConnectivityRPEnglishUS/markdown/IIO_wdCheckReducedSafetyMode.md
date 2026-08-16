# wdCheckReducedSafetyMode

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
<p class="tablehead">wdCheckReducedSafetyMode</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Checks if Watchdog is in RSEF mode.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint8 wdCheckReducedSafetyMode(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function checks, if the watchdog is running 
 in reduced-safety-enhanced-function (RSEF) mode. If so, the watchdog settings 
 can be modified at runtime.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2" style="width:100px;" width="100px">
<p class="tabledefault">Return value</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">false</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Watchdog is running in safety mode</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">true</p></td>
<td class="hcp2">
<p class="tabledefault">Watchdog is running in RSEF mode</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">asdWriteUserDebug("Active = %u ReducedSafety = %u \n", 
 wdCheckActive(), <span class="gui">wdCheckReducedSafetyMode()</span>);</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><a href="IIO_wdSetSafetyMode.md">wdSetSafetyMode</a>, 
 <a href="IIO_wdCheckActive.md">wdCheckActive</a></p>
<p class="tabledefault"><a href="IIO_asdWriteUserDebug.md">asdWriteUserDebug</a></p></td>
</tr>
</table>
