# Project Transfer to INTECRIO

The second step the project transfer to INTECRIO. This is done in the [INTECRIO Project Transfer window](IIO_INTECRIO_ProjectTransferWindow.md).

You have four choices:

1. If you only want to generate the code required for INTECRIO, the Paths field in the INTECRIO Project Transfer window is the only one that must contain a value. The Workspace and System fields must be empty.

This might be the case when the generated code is intended for transfer.

Mere code generation for INTECRIO is possible even if no INTECRIO version is installed on your computer.

See [Generated Files for Project Transfer](IIO_GeneratedFiles_ProjectTransfer.md) for a description of the generated files that are significant for working with INTECRIO.

1. If you want to generate code and import it into INTECRIO, you must also select the INTECRIO version and the INTECRIO workspace. The Systems field remains empty.

ASCET does not check whether an existing workspace was created with the selected INTECRIO version. If you select another INTECRIO version than the one used to create the workspace, the transfer can fail.

By default, the version of INTECRIO last installed is selected in the Version combo box. If only one INTECRIO version is installed, this is selected automatically; the field is disabled.

If the workspace does not exist, it is created automatically.

1. If you want to generate code, import it and integrate it into INTECRIO (i.e. add it to an INTECRIO system project), enter the INTECRIO system project you want to work with in the Systems field.

In this case, both workspace and system project already have to exist.

1. If you want to generate code, import and integrate it into INTECRIO and start the Build process in INTECRIO, complete all fields and activate Trigger INTECRIO Build.

To ensure the Build process can run, and generates a usable prototype, a hardware system and the operating system configuration have to be completely specified in INTECRIO.

Once transfer has been completed, you can experiment with the project in INTECRIO. Depending on what specifications you have made for the transfer, you have to carry out different steps.

##### Messages

If you want messages that are read and written in the ASCET model to appear as signal sources/sinks, deactivate the Ignore internally connected messages option. This option works with all of the four choices. The table below summarizes the message-to-interface-conversion for the activated and deactivated option. In the left (ASCET) half of the table, S indicates messages sent by the respective component, R indicates messages received by the respective component.

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
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="3" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">Message Access in</p></td>
<td class="hcp3" colspan="2" rowspan="1">
<p align="center" class="tablehead" style="text-align: center;">INTECRIO Interface</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tablehead">project</p></td>
<td class="hcp3">
<p class="tablehead">module A</p></td>
<td class="hcp3">
<p class="tablehead">module B</p></td>
<td class="hcp3">
<p class="tablehead">option activated</p></td>
<td class="hcp3">
<p class="tablehead">option deactivated</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">---</p></td>
<td class="hcp3">
<p class="tabledefault">---</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault">---</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">S</p></td>
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault">---</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td>
<td class="hcp3">
<p class="tabledefault">signal sink</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"> </p></td>
<td class="hcp3">
<p class="tabledefault">R</p></td>
<td class="hcp3">
<p class="tabledefault">S/R</p></td>
<td class="hcp3">
<p class="tabledefault">---</p></td>
<td class="hcp3">
<p class="tabledefault">signal source</p></td></tr>
</table>

See also

[Starting the Transfer](IIO_StartTransfer.md)

[INTECRIO Project Transfer Window](IIO_INTECRIO_ProjectTransferWindow.md)

[Generated Files for Project Transfer](IIO_GeneratedFiles_ProjectTransfer.md)
