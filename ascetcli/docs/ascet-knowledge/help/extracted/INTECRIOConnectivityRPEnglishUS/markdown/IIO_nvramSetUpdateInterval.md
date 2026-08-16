# nvramSetUpdateInterval

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
<p class="tablehead">nvramSetUpdateInterval</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the automatic NVRAM update interval.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 nvramSetUpdateInterval(uint32 interval_sec)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the automatic NVRAM update interval. This is 
 the desired time between two updates. If system load is high, the actual 
 time interval might be larger (depends significantly from the requested 
 consistency level). If the actual update interval exceeds the requested 
 interval for 10 times, a warning is issued inside the experiment environment.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_SUCCESS</p></td>
<td class="hcp2">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_INVALID_ARG</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">Interval_sec</span> &gt; 
 30</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault">Parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">interval_sec</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Update interval in seconds. Must be a value between 
 0 and 30 (0: no periodical update).</p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramGetUpdateInterval.md">nvramGetUpdateInterval</a></p></td>
</tr>
</table>
