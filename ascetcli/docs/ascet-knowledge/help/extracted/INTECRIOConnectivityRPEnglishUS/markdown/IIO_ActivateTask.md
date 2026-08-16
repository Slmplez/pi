# ActivateTask

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
<p class="tablehead">ActivateTask</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">Activates a SW task.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">StatusType ActivateTask(TaskType task)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault"><span class="emphasiscode" style="font-weight: bold;">ActivateTask()</span> 
 requires the operating system to process the SW task specified by <span class="emphasiscode">task</span>. If this task activation is successful, 
 the processing of the task is planned according to its priority by the 
 ERCOSEK scheduler.</p>
<p class="tabledefault">If several activations of a task are allowed (according 
 to the BCC2 definition) and the current number of activations of a task 
 is &gt; 1, this task is temporarily stored in the FIFO buffer.</p>
<p class="tabledefault">If <span class="emphasiscode" style="font-weight: bold;">ActivateTask()</span> 
 cannot be executed successfully, the system switches to the user-specific 
 error function.</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2" style="width:100px;" width="100px">
<p class="tabledefault">Return code</p></td>
<td class="hcp2">
<p class="code">E_OK</p></td>
<td class="hcp2">
<p class="tabledefault">Activation successful.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="code">E_OS_LIMIT</p></td>
<td class="hcp2">
<p class="tabledefault">No activation, as maximum number of task activations 
 for the task specified has already been reached or because the maximum 
 number of tasks in the task FIFO buffer at the specified priority level 
 has already been reached.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="code">ActivateTask(synchroSeq);</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">---</p></td>
</tr>
</table>
