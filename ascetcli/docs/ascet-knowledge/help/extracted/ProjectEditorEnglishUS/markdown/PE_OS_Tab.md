- Seconds [s] and Ticks [t] options

These options specify whether the time is given in seconds or in system ticks. The unit of the fields Period, Delay, etc., is set according to your selection.

- Tick Duration field

System tick duration in nanoseconds.

- Enable Monitoring option

If activated, hook routines for debugging purposes can be generated.

# OS Tab

This tab is not visible when the EHOOKS target or an [RTE-AUTOSAR *](Build_Options.md) operating system is selected.

This tab contains the following elements:

- Preemp. levels field

Number of preemptive levels. The maximum value depends on the selected target.

- Coop. levels field

Number of cooperative levels. The maximum value depends on the selected target.

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
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng"> </p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: Center;">Max. no. of</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng"> </p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">preemp. levels</p></td>
<td class="hcp2">
<p class="tableheadeng">coop. levels</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">PC target</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">0</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">20</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ASCET-RP targets (ERCOSEK)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">20</p></td>
<td class="hcp2">
<p align="center" class="tabledefaulteng" style="text-align: Center;">20</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">ASCET-RP targets (RTA-OSEK)</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">32</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">32</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaulteng">ANSI-C target</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">64</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">0</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tabledefaulteng">ASCET-SE targets</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: Center;">n/a (depends on target and OS)</p></td>
</tr>
</table>

- [Options for ASCET-SE targets](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->
- [Options for PC target and ASCET-RP targets](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

- Application Modes field

Lists all application modes of the project.

- ![](BUTTON.GIF) >> and >> next to the Application Modes field

These buttons are used to assign/deassign application modes to tasks. At least one task and one application mode must be selected.

- Processes field

Lists all modules included in the project. Each module can be expanded to display its processes.

- ![](BUTTON.GIF) >> and >> next to the Processes field

These buttons are used to assign/deassign processes to tasks. At least one task and one process must be selected.

- Tasks field

Lists all tasks of the process. The associated application mode is given in brackets. Each task can be expanded to display its assigned processes.

- [Task Options](PE_Task_Options.md) area

The properties of a selected task can be set via the options and fields at the right-hand side of the tab.

- Unused processes only option

If activated, only processes not assigned to any task are shown in the Processes field.

See also

[Task Options](PE_Task_Options.md)

[Operating System Settings (RTA-OSEK + Generic-OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)

[Operating System Settings (ERCOSEK + Generic OS)](setoperating.md)

[Software Component Editor - Overview](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeditorOverview.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
