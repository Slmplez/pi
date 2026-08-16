# nvramManualUpdateBlocked

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
<p class="tablehead">nvramManualUpdateBlocked</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Starts a manual update of the NVRAM content (blocking 
 on the current priority).</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 nvramManualUpdateBlocked(uint32 timeoutUs)</p></td>
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
 This function blocks on the current priority until all NV variable contents 
 have been written to the local buffer or until a time-out occurred. After 
 the function has returned, the update process (writing from local buffer 
 into the NVRAM) is continued in the Idle task (even if a time-out occurred). 
 The completion of the update process can be tested via the function <span class="emphasiscode">nvramCheckRunningUpdate()</span>.</p>
<p class="tabledefault">Because interrupts are not suspended during this 
 process, a preemptive task with higher priority might interrupt the update 
 process. This could lead to data inconsistencies if this task modifies 
 any NV variable contents.</p>
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
<p class="tabledefault">Other Update process (manual or cyclic) is currently 
 running. Start of manual update failed.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault">Parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">timeoutUs</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Time-out period in <span class="emphasissymbol">m</span>s</p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramManualUpdateExit.md">nvramManualUpdateExit</a>, 
 <a href="IIO_nvramManualUpdateBackground.md">nvramManualUpdateBackground</a>, 
 <a href="IIO_nvramCheckRunningUpdate.md">nvramCheckRunningUpdate</a></p></td>
</tr>
</table>
