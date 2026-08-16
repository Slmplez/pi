# Interrunnable Variables

AUTOSAR allows the configuration of interrunnable variables that provide a way for runnable entities of one SWC to communicate between themselves.

While inter-runnable communication is possible through user code and shared variable access (protected by [exclusive areas](ASCexclusiveAreas.md)), this can be inefficient when handling primitive data types since the exclusive area API calls are typically mapped onto the underlying Operating System’s resource control mechanism.

Interrunnable variables can be used as lightweight mechanisms for inter-runnable communication. They can be of scalar (i.e. cont, limitInt, wrapInt, sdisc, udisc, log), enum, composite (i.e. array) or complex (i.e. record) type. The main purpose of complex interrunnable variables is to guarantee data consistency over the values grouped in the record.

Interrunnable variables are declared by the RTE; they use similar communication mechanisms as sender-receiver communication, i.e. implicit and explicit (only scalar and composite interrunnable variables) communication. Depending on the communication mode, interrunnable variables are displayed as shown in the table.

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
<p class="tabledefault">communication mode</p></td>
<td class="hcp2">
<p class="tabledefault">type</p></td>
<td class="hcp2">
<p class="tabledefault">in <span class="gui">Outline</span> tab</p></td>
<td class="hcp2">
<p class="tabledefault">in drawing area</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2">
<p class="tablehead">Explicit</p></td>
<td class="hcp2">
<p class="tablehead">Scalar</p></td>
<td class="hcp2">
<p class="tabledefault"><img border="0" class="hcp3" height="14" src="symbol_irvE1.gif" style="width:113px; height:14px;" width="113" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp2">
<p class="tabledefaulteng"><img border="0" class="hcp3" height="33" src="symbol_irvE2.gif" style="width:93px; height:33px;" width="93" x-maintain-ratio="TRUE"/></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Array</p></td>
<td class="hcp2">
<p class="tabledefault"><img border="0" class="hcp3" height="14" src="symbol_irvAE1.gif" style="width:162px; height:14px;" width="162" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp2">
<p class="tabledefaulteng"><img border="0" class="hcp3" height="71" src="symbol_irvAE2.gif" style="width:81px; height:71px;" width="81" x-maintain-ratio="TRUE"/></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="3">
<p class="tablehead">Implicit</p></td>
<td class="hcp2">
<p class="tablehead">Scalar</p></td>
<td class="hcp2">
<p class="tabledefault"><img border="0" class="hcp3" height="14" src="symbol_irvI1.gif" style="width:125px; height:14px;" width="125" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp2">
<p class="tabledefaulteng"><img border="0" class="hcp3" height="33" src="symbol_irvI2.gif" style="width:103px; height:33px;" width="103" x-maintain-ratio="TRUE"/></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Array</p></td>
<td class="hcp2">
<p class="tabledefault"><img border="0" class="hcp3" height="14" src="symbol_irvAI1.gif" style="width:160px; height:14px;" width="160" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp2">
<p class="tabledefaulteng"><img border="0" class="hcp3" height="71" src="symbol_irvAI2.gif" style="width:81px; height:71px;" width="81" x-maintain-ratio="TRUE"/></p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Record</p></td>
<td class="hcp2">
<p class="tabledefault"><img border="0" class="hcp3" height="14" src="symbol_irvR1.gif" style="width:119px; height:14px;" width="119" x-maintain-ratio="TRUE"/></p></td>
<td class="hcp2">
<p class="tabledefaulteng"><img border="0" class="hcp3" height="101" src="symbol_irvR2.gif" style="width:145px; height:101px;" width="145" x-maintain-ratio="TRUE"/></p></td></tr>
</table>

Rules for non-scalar interrunnable variables:

- Composite interrunnable variables must be of [array](IntroductionEnglishUS.chm::/INT_Array.htm) type.

They can have implicit or explicit behavior (see also [Rte_IrvIRead and Rte_IrvIWrite](asc_rte_irviread_rte_irviwrite.md) and [Rte_IrvRead and Rte_IrvWrite](asc_rteirv_read_rte_irvwrite.md)).

- Complex interrunnable variables must be of [record](RecordsEnglishUS.chm::/RC_overview.htm) type.

They must have implicit behavior (see also [Rte_IrvIRead and Rte_IrvIWrite](asc_rte_irviread_rte_irviwrite.md)).

- Complex interrunnable variables can only be used with AUTOSAR R4.0.2 or higher. With older AUTOSAR versions, an error (MMdl650) is issued during code generation.
- Records used as complex interrunnable variables must not contain or matrices, or other records that contain matrices. If a record used as interrunnable variable contains a matrix, an error (MMdl651) is issued during code generation.

See also

[Creating a Scalar Interrunnable Variable](asc_createinterrunnablevariable.md)

[C](RCE_CreateInterrunnableVariable_Record.md)reating an Interrunnable Variable of Non-Scalar Type

[R](asc_rte_irviread_rte_irviwrite.md)te_IrvIRead and Rte_IrvIWrite

[Rte_IrvRead and Rte_IrvWrite](asc_rteirv_read_rte_irvwrite.md)

[Exclusive Areas](ASCexclusiveAreas.md)

[Sender-Receiver Communication](ASCsenderReceiverCommunication.md)

[Runnable Entities and Events](ASCRunnableEntity.md)

[Records - Overview](RecordsEnglishUS.chm::/RC_overview.htm)
