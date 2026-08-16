# nvramManualUpdateExit

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
<col style="width: 0px;"/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1" width="100">
<p class="tablehead">nvramManualUpdateExit</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="0">
<p class="tabledefault">Ensures a final update of the NVRAM content.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="0">
<p class="code">void nvramManualUpdateExit (void)</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="0">
<p class="tabledefault">This function should be placed inside the Exit task 
 after the last user process, to ensure a final update of the NVRAM content 
 when the user application mode is left (Stop ERCOS Button). Error messages 
 are posted inside the experiment environment if an error occurs.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="0">
<p class="tabledefault">---</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="1" rowspan="1" width="0">
<p class="tabledefault"><a href="IIO_nvramManualUpdateBackground.md">nvramManualUpdateBackground</a>, 
 <a href="IIO_nvramManualUpdateBlocked.md">nvramManualUpdateBlocked</a></p></td></tr>
</table>
