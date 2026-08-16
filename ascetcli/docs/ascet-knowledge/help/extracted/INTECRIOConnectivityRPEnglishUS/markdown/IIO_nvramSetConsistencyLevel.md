# nvramSetConsistencyLevel

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
<p class="tablehead">nvramSetConsistencyLevel</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the level of NV variable data consistency.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 nvramSetConsistencyLevel(T_consistencyLevel level)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Sets the level of NV variable data consistency.</p>
<p class="tabledefault"><span class="guivar">No consistency:</span> NVRAM update 
 is done without respect to consistency inside NV variables and between 
 individual NV variables.</p>
<p class="tabledefault"><span class="guivar">Low level consistency:</span> 
 data consistency within NV variables (scalars, vectors and matrices but 
 not characteristics) is guaranteed.</p>
<p class="tabledefault"><span class="guivar">High level consistency:</span> 
 all NV variables are updated without interruption by the model, out of 
 the idle task.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_SUCCESS</p></td>
<td class="hcp2">
<p class="tabledefault">Success</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_INVALID_ARG</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Invalid level argument</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault">Parameter</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">level</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">NVRAM_NO_CONSISTENCY</span></p>
<p class="tabledefault"><span class="emphasiscode">NVRAM_LOW_CONSISTENCY</span></p>
<p class="tabledefault"><span class="emphasiscode">NVRAM_HIGH_CONSISTENCY</span></p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramGetConsistencyLevel.md">nvramGetConsistencyLevel</a></p></td>
</tr>
</table>
