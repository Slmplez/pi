# nvramGetConsistencyLevel

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
<p class="tablehead">nvramGetConsistencyLevel</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Gets the level of NV variable data consistency.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">T_consistencyLevel nvramGetConsistencyLevel(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Gets the level of NV variable data consistency.</p>
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
<p class="code">NVRAM_NO_CONSISTENCY</p></td>
<td class="hcp2">
<p class="tabledefault">No consistency</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">NVRAM_LOW_CONSISTENCY</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Low level consistency</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1" style="width:100px;" width="100px">
<p class="tabledefault"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">NVRAM_HIGH_CONSISTENCY</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">High level consistency</p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramSetConsistencyLevel.md">nvramSetConsistencyLevel</a></p></td>
</tr>
</table>
