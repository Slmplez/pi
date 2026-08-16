- Value field

Used to enter the constant value.

- Frequency field

Not available for step.

Used to enter the frequency in Hz (i.e. 1/s, not rad/s) of the stimulation signal.

- Phase field

Used to set the phase, i.e. the offset from the time axis, in seconds.

- Offset field

Used to enter the offset for the y-axis.

- Amplitude field

Used to enter the amplitude.

- Time Scale field

Used to enter a factor for the time scale provided in the table's x-axis.

- ![](BUTTON.GIF) Edit Table

Opens the table editor. The x-axis contains the time in seconds, the y-axis contains the values.

- Signal combo box

Lists all channels contained in the signal defined in the data generator (see also [Defining a Signal](EE_define_signal.md)).

- Offset field

Used to enter the offset for the y-axis.

- Amplitude field

Used to enter the amplitude.

- Mean field

Used to enter the mean value (or expected value) of the Gaussian distribution.

- Variance field

Used to enter the variance of the Gaussian distriburion.

# Stimulus Dialog Window

This window is opened from the experiment window, via the Tools menu, Stimulate menu option.

The Stimulus dialog window contains the following elements.

- Mode combo box

Used to select the stimulation mode. Available modes are:

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
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">constant</p></td>
<td class="hcp3">
<p> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">sine</p></td>
<td class="hcp3" colspan="1" rowspan="4">
<p class="tabledefaulteng">cyclic modes</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">ramp</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">pulse</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">step</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">table</p></td>
<td class="hcp3">
<p class="tabledefaulteng"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">signal</p></td>
<td class="hcp3">
<p class="tabledefaulteng"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">random</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">gaussian</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng"> </p></td></tr>
</table>

Depending on the selected mode, the following fields are available.

[constant](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

[cyclic modes](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

[table](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

[signal](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->

[random](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a5'); //-->

[gaussian](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

![](BUTTON.GIF) OK

Applies the stimulation mode to the selected variable and closes the Stimulus dialog window.

![](BUTTON.GIF) Apply

Applies the stimulation mode to the selected variable without closing the Stimulus dialog window.

![](BUTTON.GIF) Cancel

Closes the Stimulus dialog window and discards the settings.

You can

[Set up a Constant Stimulation Mode](constant_mode.md)

[Set up a Cyclic or Random Stimulation Mode](cyclic_mode.md)

[Set up a Table Stimulation Mode](table_mode.md)

[Set up a Signal Stimulation Mode](matrix_mode.md)

[Set up a Gaussian Stimulation Mode](gaussian_mode.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
