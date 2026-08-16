# Setting up a Segment Event

To set up a segment event, proceed as follows:

1. Open the Event dialog window for the event (see [Setting up an Event](setup_event.md)).
1. Select segment from the Mode combo box.

A window opens that lists all variables of your component.

1. Select the variable that is to serve as the segment variable and click OK.

The segment variable should represent the rotational speed in revolutions per minute.

1. Adjust the crankshaft angle in the call every °CS field of the Event window.
1. Click OK.

The segment event is now triggered at the beginning of every segment interval tseg (in degrees), which is calculated according to the following formula:

<table cellspacing="0" style="x-cell-content-align: top;
				left: 0px;
				top: 264px;
				width: 214px;
				float: alignleft;
				border-spacing: 0px;
				border-spacing: 0px;" width="214" x-use-null-cells="">
<col style="width: 47.924%;"/>
<col style="width: 52.076%;"/>
<tr class="hcp1" valign="top">
<td colspan="1" rowspan="2" style="width: 47.924%;
			padding-right: 10px;
			padding-left: 10px;
			x-cell-content-align: center;" valign="middle" width="47.924%">
<p align="right" style="text-align: right;">t<span style="vertical-align: Sub;">Seg</span> [s]=</p></td>
<td style="width: 52.076%;
			padding-right: 10px;
			padding-left: 10px;
			border-top-style: none;
			border-right-style: none;
			border-bottom-color: #000000;
			border-bottom-width: 1px;
			border-bottom-style: Solid;" width="52.076%">
<p style="x-text-underline: off; /*begin!kadov{{*/ text-decoration: none; /*}}end!kadov*/ ">CS 
 [deg]</p></td></tr>
<tr class="hcp1" valign="top">
<td style="width: 52.076%;
			padding-right: 10px;
			padding-left: 10px;
			border-right-style: none;
			border-bottom-style: none;" width="52.076%">
<p>n[1/min] p<span style="vertical-align: Super;">6</span></p></td></tr>
</table>

n is the rotational speed in revolutions per minute, and CS is the crankshaft angle that specifies the revolution.

See also

[Setting up an Event](setup_event.md)
