# Allowable Arithmetic Services

For all calculations that occur in ASCET, there is a corresponding arithmetic service, which the user can customize and optimize to suit specific needs. The table below lists all of the arithmetic services that are understood by ASCET, as well as the corresponding number and the type of the parameters (O = operation; 1,2,3 = operand1, 2, 3; R = result) and the meaning of the function. In addition, it specifies a standard function definition as can be generated automatically by the AS Editor (see [Interface Editor for Arithmetic Services](interface_editor_as.md)).

The number and order of the parameters in the table is the default. In principle, kind, number and order of the parameters is not restricted (as long as the C syntax is correct), you can add more parameters for special purposes ([Specifying an entry](specifying_entry.md)).

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
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Function Key</p></td>
<td class="hcp2">
<p class="tablehead">Standard Function Definition</p></td>
<td class="hcp2">
<p class="tablehead">Parameters</p></td>
<td class="hcp2">
<p class="tablehead">Meaning</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">abs|*|*</span></p></td>
<td class="hcp2">
<p class="tabledefaulteng">abs_%t1%_%tr% (%i1%)</p></td>
<td class="hcp2">
<p class="tabledefaulteng">O|1|R</p></td>
<td class="hcp2">
<p class="tabledefaulteng">Deriving the absolute value</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">neg|*|*</span></p></td>
<td class="hcp2">
<p class="tabledefaulteng">neg_%t1%_%tr% (%i1%)</p></td>
<td class="hcp2">
<p class="tabledefaulteng">O|1|R</p></td>
<td class="hcp2">
<p class="tabledefaulteng">Negating a value</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">+|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">add_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Addition of two values</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">+l|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">addl_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Addition of two values with saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">-|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">sub_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Subtraction of two values</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">-l|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">subl_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Subtraction of values with saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">mul_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of two values</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*l|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">mull_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of values with saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">/|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">div_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Division of two values</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">/l|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">divl_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Division of two values with saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">%|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">mod_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Modulo calculation of two values</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">%l|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">modl_%t1%%t2%_%tr%(%i1%, %i2%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Modulo calculation of two values with saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*&gt;|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">mul_r_%t1%%t2%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of two values with subsequent right 
 shift</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*&gt;l|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">mul_rl_%t1%%t2%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of two values with subsequent right 
 shift and result limitation</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">/&gt;|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">div_r_%t1%%t2%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Division of two values with subsequent right shift</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">/&gt;l|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">div_rl_%t1%%t2%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Division of two values with subsequent right shift 
 and result limitation</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*/|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">muldiv_%t1%%t2%%t3%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of two values with subsequent division</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">*/l|*|*|*|*</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">muldivl_%t1%%t2%%t3%_%tr%(%i1%, %i2%, %i3%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O|1|2|3|R</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Multiplication of two values with subsequent division 
 and saturation<span class="hcp3">a</span></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">getHighPart</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">_(%i1%)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">O</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">Returns the highest bit of a value</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="4" rowspan="1">
<p class="tabledefault">a: Saturation refers to the act of limiting results 
 to within maximum possible range of values for the relevant type of result.</p></td>
</tr>
</table>

See also

[Interface Editor for Arithmetic Services](interface_editor_as.md)

[Specifying an entry](specifying_entry.md)
