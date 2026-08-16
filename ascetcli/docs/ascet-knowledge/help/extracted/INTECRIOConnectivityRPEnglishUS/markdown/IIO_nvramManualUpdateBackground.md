# nvramManualUpdateBackground

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
<p class="tablehead">nvramManualUpdateBackground</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Starts a manual update of the NVRAM content.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 nvramManualUpdateBackground(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function starts a manual update of the NVRAM 
 content. Manual update has precedence over the automatic periodical update. 
 Thus, a potentially running periodical update is aborted. But if cyclic 
 update is on the way (the Idle task is interrupted by a preemptive task 
 with the call of this function), start of manual update is impossible 
 This function returns immediately, because the update is running in the 
 background (Idle task). The completion of this process can be tested via 
 the function <span class="emphasiscode">nvramCheckRunningUpdate()</span>.</p>
<p class="note">It is not recommended to use this function when automatic 
 update is enabled.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="5" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_SUCCESS</p></td>
<td class="hcp2">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_NO_NV_VARIABLES</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">No NV variables inside the model</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_FATAL_ERROR</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Fatal error occurred before</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_OVERFLOW</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Overflow of NVRAM. Reduce Number / Size of NV variables.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_UPDATE_RUNNING</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Other update process (manual or cyclic) is currently 
 running. Start of manual update failed.</p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramManualUpdateBlocked.md">nvramManualUpdateBlocked</a>, 
 <a href="IIO_nvramManualUpdateExit.md">nvramManualUpdateExit</a></p></td>
</tr>
</table>
