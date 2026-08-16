# High-Resolution Interpolation Routines

In many cases, memory space can be saved by using a less accurate representation for the data values (below: "normal" type), but calculating the interpolation value with high accuracy (below: "double precision" type). This demand requires a change to the interpolation calculation.

For this purpose, ASCET offers high-resolution interpolation routines.

Any interpolation routine can be used as high-resolution routine by activating the Double Precision option in the ASCET options window, Build\Interpolation Routine\<routine name> node.

If Double Precision is activated for a given interpolation routine, the result types of the functions getAt*, getAtFixed*, interpol*, interpolGroup* (*=1 for characteristic lines, *=2 for characteristic maps) are changed; they use an implementation type of "double-precision" and a different formula.

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
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">"normal" type</p></td>
<td class="hcp2">
<p class="tablehead">"double precision" type</p></td>
<td class="hcp2">
<p class="tablehead">scaling factor</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">sint8</span></p></td>
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">sint16</span></p></td>
<td class="hcp2">
<p class="tabledefault">256</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">uint8</span></p></td>
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">uint16</span></p></td>
<td class="hcp2">
<p class="tabledefault">256</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">sint16</span></p></td>
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">sint32</span></p></td>
<td class="hcp2">
<p class="tabledefault">65536</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">uint16</span></p></td>
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">uint32</span></p></td>
<td class="hcp2">
<p class="tabledefault">65536</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">real32</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">real64</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">1</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="3" rowspan="1">
<p class="note">For <span class="emphasiscode">sint32</span>, <span class="emphasiscode">uint32</span>, 
 and <span class="emphasiscode">real64</span>, double precision is not possible; 
 an error of type MMdl609 is issued.</p></td>
</tr>
</table>

If a value type has the implementation range [lower, upper] and the formula f(phys) = offset + scaling*phys, then the "double-precision" implementation range is calculated by [lower*scaling_factor, upper*scaling_factor], and the "double-precision" formula is given by f(phys) = offset*scaling_factor + scaling*phys*scaling_factor.

The interpolation calculation of a characteristic line changes from

y = (x-x0)*(y1-y0) / (x1-x0)

to

y = ((x-x0)*(y1-y0)*scaling_factor) / (x1-x0);

The calculation for a characteristic map changes accordingly.

See also

[Interpolation Routines](INT_InterpolationRoutines.md)
