# Solver configuration Window

This window is used to configure the integration method during an experiment. It contains the following elements:

Block field

Contains the name of the CT block used in the experiment.

Integrator combo box

Used to select the integration method. For new CT blocks, the integration method selected in the [CT-Solver](ComponentManagerEnglishUS.chm::/CM_CTSolverOptions.htm) node of the ASCET options dialog window is shown. For existing CT blocks, the integration method selected in this window during the last experiment is shown. Available selections are:

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
				margin-left: 0.636cm;" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Euler</p></td>
<td class="hcp2" colspan="1" rowspan="5">
<p class="tabledefaulteng">fixed step size</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Mulstep 
 2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Heun</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">Adams-Moulton 
 2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Runge-Kutta 
 4</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Dormand/Prince RK5</p></td>
<td class="hcp2" colspan="1" rowspan="7">
<p>variable step size</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Calvo 6(5)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Dormand/Prince RK8</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Implicit RK2</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Implicit RK4</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Implicit Gear 1</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Implicit Gear 2</p></td>
</tr>
</table>

text field

Contains a short description of the selected integration method.

Depending on the selected integration method, a selection of the following setup fields is available.

dT

Communication time frame, i.e. the interval in which the block communicates with the outside.

h

Integration step size, i.e. the interval for internal calculations.

Initial h

Integration step size for solvers with variable step size.

Minimum h and Maximum h

Upper and lower limits for the h parameter which is calculated according to the model dynamics when the variable step size solvers are used. Maximum h must be less than or equal to dT.

Relative error and Absolute error

Relative error and absolute error allowed for the calculation of h, available for solvers with variable step size.

Max. iterations

Maximum number of iterations used to calculate the h parameter. Once the specified number of steps has been carried out, the h value at that point will be used.

![](BUTTON.GIF) Default

Restores the default settings for the selected Integrator.

![](BUTTON.GIF) Set as Default

Uses the current settings as default values for the selected Integrator.

![](BUTTON.GIF) OK

Closes the window and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the window without accepting the settings.

You can

[Configure the Integration Method](CTB_Configuring_the_Solver.md)
