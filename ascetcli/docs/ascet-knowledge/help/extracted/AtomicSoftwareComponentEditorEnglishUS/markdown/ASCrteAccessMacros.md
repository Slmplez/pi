# RTE Access Macros

The runtime environment or RTE specifies access macros for each communication mechanism.

- [Rte_IRead](ASCrteIRead.md)
- [Rte_IWrite](ASCrteIWrite.md)
- [Rte_IWriteRef](ASCrteIWriteRef.md)
- [Rte_Read](ASCrteRead.md)
- [Rte_Write](ASCrteWrite.md)
- [RTE_DRead](asc_rtedread.md)
- [Rte_IrvIRead and Rte_IrvIWrite](asc_rte_irviread_rte_irviwrite.md)
- [Rte_IrvRead and Rte_IrvWrite](asc_rteirv_read_rte_irvwrite.md)
- [Rte_Mode](ASCrteMode.md)
- [Rte_Enter and Rte_Exit](ASCrteEnterRTEExit.md)
- [Rte_Call](ASCrteCall.md)
- [Rte_Calprm](ASCrteCalprm.md)

The AUTOSAR RTE specification contains a list of error codes that can be returned by RTE access macros. These error codes can be accessed in the model via the RTE Status element in the Basic Blocks palette or toolbar.

ASCET provides a built-in enumeration type Std_ReturnType that contains possible error codes. All enumeration values defined by the AUTOSAR standard are made known to each SWC and thus are valid to be used even if no element with such a type has been created. Enumeration types used in an SWC must not specify any (symbolic) value used already by Std_ReturnType.

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
<p class="tableheadeng"><a name="ErrorCode">Error code</a></p></td>
<th colspan="2" rowspan="1" style="padding-top: 2px;
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
<p class="tableheadeng">Available in AUTOSAR Release</p></th>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: center;">R3.*</p></td>
<td class="hcp2">
<p align="center" class="tableheadeng" style="text-align: center;">R4.0.*</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_COM_STOPPED</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_COMMS_ERROR</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_LIMIT</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_LOST_DATA</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_MAXAGE_EXCEEDED</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_NO_DATA</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_OK</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_TIMEOUT</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng"><span class="emphasiscode">RTE_E_TRANSMIT_ACK</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
</table>
