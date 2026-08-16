# DeclareAppMode

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
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="2" rowspan="1">
<p class="tablehead">DeclareAppMode</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Function</p></td>
<td class="hcp2">
<p class="tabledefault">Serves as an external declaration of an application 
 mode.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Syntax</p></td>
<td class="hcp2">
<p class="code">#define DeclareAppMode(AppID)</p>
<p class="code">extern AppModeType AppID</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Description</p></td>
<td class="hcp2">
<p class="tabledefault">If an application mode switch is performed within 
 a module, but the application mode descriptor is defined in another module, 
 the usage of the application mode descriptor must be disclosed by <span class="emphasiscode" style="font-weight: bold;">DeclareAppMode()</span>.</p>
<p class="tabledefault">The function and use of this service are similar 
 to that of the external declaration of variables.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">Example</p></td>
<td class="hcp2">
<p class="code">extern uint excCtr;</p>
<p class="code">extern uint randx;</p>
<p class="code"><span class="gui">DeclareAppMode</span>(idleMode);</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" style="width:100px;" width="100px">
<p class="tabledefault">See also</p></td>
<td class="hcp2">
<p class="tabledefault"><a href="IIO_DeclareTask.md">DeclareTask</a></p></td></tr>
</table>
