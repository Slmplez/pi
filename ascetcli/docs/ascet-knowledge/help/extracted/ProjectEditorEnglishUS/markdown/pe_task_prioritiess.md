# Task Priorities

Each task is furthermore assigned to one of the following scheduling groups, preemptive or cooperative, and inside each group to one of the available priority levels. The number of priority levels for each scheduling group can be defined by the user, and determines the memory demand of the scheduler tables. It should be optimized for the final system.

Tasks at a higher priority than the running task can interrupt the running task. If the interrupting task belongs to the preemptive scheduling group, the running task is interrupted immediately, otherwise the interrupt happens at the end of the current process. Preemptive tasks always have a higher priority than cooperative tasks. The figure shows the priority scheme. The actually available tasks depend on the selected target.

![](OS_prioschema.gif)

Each time a task is activated, the time elapsed since the previous activation is stored in the global variable dT. This variable can be used in the definition of algorithms to describe the control algorithms independent of their sample rate.

The OS editor allows to edit the maximum number of task priorities of an OS configuration. The table below shows default and maximum values for cooperative and preemptive task priorities, as well as the maximum total number of task priorities.

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
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2">
<p class="tableheadeng">Target + OS</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tableheadeng">default no. of</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tableheadeng">max. no. of </p></td>
<th colspan="1" rowspan="2" style="padding-top: 2px;
			padding-bottom: 2px;
			border-left-style: Inset;
			border-top-style: Inset;
			border-right-style: Inset;
			border-bottom-style: Inset;
			padding-left: 2px;
			padding-right: 2px;
			border-left-width: 1px;
			border-top-width: 1px;
			border-right-width: 1px;
			border-bottom-width: 1px;">
<p class="tableheadeng">total max. no.</p>
<p class="tableheadeng">of levels</p></th></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">coop. levels</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">preemp. levels</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">coop. levels</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">preemp. levels</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">PC / generic</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">0</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">0</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ES1130 / ERCOSEK 4.3</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ES1135 / ERCOSEK</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">40</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ES1135 / ERCOSEK 4.3</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">20</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">236</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">Prototyping</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">100</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">100</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">100</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">100</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">200</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ES910 / RTA-OSEK V5.0</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">253</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">253</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">253</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">RTPRO-PC</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">32</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">64</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ASCET-SE targets / *</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p>as specified in <span class="emphasiscode">target.ini</span></p></td>
<td class="hcp2" colspan="3" rowspan="1">
<p>as specified in <span class="emphasiscode">target.ini</span></p></td>
</tr>
</table>

The maximum total number of task priorities for ES113x/ERCOSEK 4.3 is currently 236, the maximum total number of task priorities for ES910 is currently 253. Setting the max. cooperative and preemptive priorities to values whose sum exceeds the maximum total number of task priorities will lead to an invalid OS configuration.

It is possible to increase the number of cooperative/preemptive levels up to the maximum cooperative/preemptive priority.

The semantic analysis of the OS configuration generates an error in the following cases:

- The sum of max. cooperative levels and max. preemptive levels is greater than the maximum priority for the target+OS combination, and a task actually has a priority that is too big.
- The maximum number of preemptive levels in the OS editor is greater than the maximum number of preemptive levels of the target+OS combination, and a preemptive task actually has a priority that is too big.
- The maximum number of cooperative levels in the OS editor is greater than the max. cooperative levels of the target+OS combination, and a cooperative task actually has a priority that is too big.
- The priority of a preemptive task is less than 0 or greater or equal than the maximum number of preemptive levels in the OS editor.
- The priority of a cooperative task is less than 0 or greater or equal than the maximum number of cooperative levels in the OS editor.

The semantic analysis of the OS configuration shall generate a warning in the following cases:

- The sum of max. number of cooperative levels and max. number of preemptive levels is greater than the maximum priority for the target+OS combination, and no task actually has a priority that is too big.
- The max. number of preemptive levels in the OS editor is greater than the max. number of preemptive levels of the target+OS combination, and no preemptive task actually has a priority that is too big.
- The max. number of cooperative levels in the OS editor is greater than the max. cooperative levels of the target+OS combination, and no cooperative task actually has a priority that is too big.

See also

[Cooperative Scheduling](cooperative_scheduling.md)

[Preemptive Scheduling](preemptive_scheduling.md)

[Basic Task Settings](basictasksetting.md)
