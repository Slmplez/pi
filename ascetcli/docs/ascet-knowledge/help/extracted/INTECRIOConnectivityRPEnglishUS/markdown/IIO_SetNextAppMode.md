# SetNextAppMode

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
<p class="tablehead">SetNextAppMode</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p>Switches to the specified application mode after processing all active 
 tasks.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">StatusType SetNextAppMode(AppModeType appMode)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><span class="emphasiscode" style="font-weight: bold;">SetNextAppMode()</span> 
 requests a change to the application mode referenced by pointer <span class="emphasiscode">appMode</span>. The operating system executes the change 
 as soon as no further task is running, i.e. when the operating system 
 is in the idle state. However, subsequent task activations via <span class="emphasiscode">ChainTask()</span> 
 or <span class="emphasiscode">RestartTask()</span> (not supported for Rapid 
 Prototyping use case) will be ignored.</p>
<p class="tabledefault">In case hardware tasks are initialized during startup 
 (initialization phase), they will be reinitialized for the next application 
 mode.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="code">E_OK</p></td>
<td class="hcp2">
<p class="tabledefault">Request successfully processed.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">SetNextAppMode(driveMode);</p>
<p class="tabledefault"><img border="0" height="180" src="SetnextAppMode.gif" style="border: none;
									float: none;
									width: 416px;
									height: 180px;
									border-style: none;" width="416" x-maintain-ratio="TRUE"/></p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">---</p></td>
</tr>
</table>
