1. An implementation cast is created on every connection of the operator output.
1. If the operator is a division operator and the Allow zero in phys. interval option is activated in the operator implementation, an implementation cast is created on the connection to the denominator input.
1. The implementation information of the following element is accepted for every implementation cast at the output of an implemented operator.

This is not the case for the model type, this is always cont for implementation casts.

1. The implementation information (apart from the model type) from the previous element is accepted for implementation casts which were added at the denominator input of a division operator.

For implementations of the component in which the operator has no implementation, No implementation is selected for newly created implementation casts.

1. The overflow handling is converted according to the following scheme:

<table style="border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				margin-top: 3px;
				x-cell-content-align: Top;
				margin-left: 1.522cm;" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<tr class="hcp1" valign="middle">
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tableheadeng"> </p></td>
<td class="hcp2" colspan="3" rowspan="1" valign="top">
<p align="center" class="tableheadeng" style="text-align: center;">Interval Adaptation settings for implementation cast</p></td>
</tr>
<tr class="hcp1" valign="middle">
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tableheadeng">Operator Implementation</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tableheadeng">Limit to maximum bit length</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tableheadeng">Reduce Resolution</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tableheadeng">Keep Resolution</p></td></tr>
<tr class="hcp1" valign="middle">
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">Reduce resolution</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">X</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">X</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng"> </p></td></tr>
<tr class="hcp1" valign="middle">
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">Keep resolution and limit</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">X</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng"> </p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">X</p></td></tr>
<tr class="hcp1" valign="middle">
<td class="hcp2" valign="top">
<p class="tabledefaulteng">Keep resolution and don't limit</p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng"> </p></td>
<td class="hcp2" colspan="1" rowspan="1" valign="top">
<p class="tabledefaulteng">n/a</p></td>
<td class="hcp2" valign="top">
<p class="tabledefaulteng">n/a</p></td></tr>
</table>

Each row shows the settings set for the implementation cast to replace the corresponding setting of the operator implementation.

1. The operator implementation is removed.

Under certain conditions implementation casts would be created with the same implementation as the element connected to their output. In these cases, no implementation cast is inserted.

1. An implementation cast is created on every connection of the operator output—even with components, operators etc. <No implementation> is selected for these implementation casts in all implementations of the component.

This implementation cast is given the relevant implementation information during manual conversion of the operator implementation.

If this kind of implementation cast already exists on one of these connections, no other implementation cast is added to this connection.

1. If the Allow zero in phys. interval option is activated in the operator implementation of a division operator, an implementation cast with <No implementation> is created on the connection of the denominator input.

If this kind of implementation cast already exists, another one is not added.

1. The operator implementation remains unchanged.

# Automatic Conversion of Operator Implementation: Results

- If the implementation of an operator (except MIN, MAX, MUX) can be converted automatically, [the following](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> happens.

1. If the implementation of an operator (except MIN, MAX, MUX) cannot be converted automatically, [the following](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //--> happens.
1. If the implementation of a MIN, MAX or MUX operator can be converted automatically, only the operator implementation is removed. No implementation cast is added.

If it is not possible to convert all operator implementations automatically in the database, the following message is issued:

Not all operator implementations could be replaced automatically. Please do the conversion manually.

Confirm this message with OK. The Operator Implementations window (see [Searching for Operator Implementations](search_op_impl.md)) opens, it shows the components which contain the remaining operator implementations. You can now convert them manually, or remove them.

See also

[Replacing Operator Implementations with Implementation Casts](replace_op_impl.md)

[Searching for Operator Implementations](search_op_impl.md)

[Removing Operator Implementations](rename_individual_op_impl.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
