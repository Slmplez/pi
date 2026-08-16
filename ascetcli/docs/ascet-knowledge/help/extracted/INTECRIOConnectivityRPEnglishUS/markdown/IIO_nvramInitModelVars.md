# nvramInitModelVars

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
<p class="tablehead">nvramInitModelVars</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Initializes the NV variables.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">uint32 nvramInitModelVars(void)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">This function initializes the NV variables with the 
 content of the NVRAM if this content is valid and matching. The initialization 
 may be triggered only once (via C code, L1 or automatic flag) and only 
 before any update of the NVRAM occurred.</p></td>
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
<p class="code">EC_NVRAM_INADMISSIBLE_USE</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">Function has already been called</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_INTERNAL_ERROR</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">An internal error occurred</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">EC_NVRAM_NO_MATCH</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">The NVRAM content does not match the current model</p></td></tr>
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
<p class="tabledefault"><a href="IIO_nvramCheckForInitializedVars.md">nvramCheckForInitializedVars</a></p></td>
</tr>
</table>
