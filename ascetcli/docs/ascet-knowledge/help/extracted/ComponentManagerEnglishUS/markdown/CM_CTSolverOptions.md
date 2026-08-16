# CT-Solver Options

In the CT-Solver node, you select the default integration method for CT blocks in offline and online experiments.

##### Default Solver

Used to select the [integration method](SpecifyingCTBlocksEnglishUS.chm::/CTB_OverviewIntegrationMethods.htm). Available selections are:

<table style="x-cell-content-align: Top;
				margin-top: 3px;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				margin-left: 0.886cm;" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Adams-Moulton 
 2</p></td>
<td class="hcp2" colspan="1" rowspan="5">
<p class="tabledefaulteng">fixed step size</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Euler </p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Heun</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">Mulstep 
 2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Runge-Kutta 
 4</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step Calvo 6(5)</p></td>
<td class="hcp2" colspan="1" rowspan="7">
<p>variable step size</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step Dormand/Prince RK5</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step Dormand/Prince RK8</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step implicit Gear 1</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step implicit Gear 2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step implicit RK2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Variable-step implicit RK4</p></td>
</tr>
</table>

The CT-Solver node contains subnodes for the available solvers. Use these subnodes to determine default settings for the solver parameters. For the meaning of the options, refer to the descriptions in the Options window.
