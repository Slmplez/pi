# Structure of the Target Directories

Target-specific information for the rapid prototyping targets are stored in subdirectories of the [target root path](ComponentManagerEnglishUS.chm::/CM_PathsNode_Build.htm). The following table shows the subdirectories:

<table style="x-cell-content-align: Top;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				margin-top: 6px;" x-use-null-cells="">
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">ASCET subdirectory</p></td>
<td class="hcp2">
<p class="tablehead">E-Target</p></td>
<td class="hcp2">
<p class="tablehead">Simulation Node</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">..\Target\ES1130</span></p></td>
<td class="hcp2">
<p class="tabledefault">ES1000.2 / ES1000.3</p></td>
<td class="hcp2">
<p class="tabledefault">ES1130</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">..\Target\ES1135</span></p></td>
<td class="hcp2">
<p class="tabledefault">ES1000.2 / ES1000.3</p></td>
<td class="hcp2">
<p class="tabledefault">ES1135</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">..\Target\ES113x</span></p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">(contains files used by both ES1000 simulation nodes, 
 e.g. compiler-specific make files)</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">.\Target\ES910</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ES910.2 / ES910.3</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">ES910</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault"><span class="emphasiscode">..\Target\QNx86</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">RTPRO-PC</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefault">RTPRO-PC</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefault"><span class="emphasiscode">..\Target\Prototyping</span></p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tabledefault">(determined in INTECRIO)</p></td>
</tr>
</table>

All makefiles and build scripts support paths with blanks.

- If a path containing blanks is to be used in a makefile, ASCET converts it to short Windows format (for example, c:\Documents and Settings would be converted to c:\DOCUME~1).
- If a path containing blanks is to be used in a batch file, ASCET generates it encapsulated in ", or converts it to short Windows format.

It is not necessary to change the target root path in the ASCET options window to correspond to the target.
