- Default direction for arguments of value type.
- In arguments can be read in the method. An error is produced for each write access to an In argument.
- In arguments get the value from the expression passed to the invoked method.

- Default direction for arguments of reference type.
- InOut arguments can be read and written in the method.
- InOut arguments must be initialized before they are passed to the invoked method.
- If an InOut argument is only read, or only written, in the method, you are informed that you can change the direction to In, or Out.
- Since an InOut argument can be written, and its value passed to the calling entity, only variables can be assigned to InOut arguments. Parameters, the output of a calculation, etc., are not allowed.

- Out arguments can be written in the method. An error is produced for each read access to an Out argument.
- Out arguments need not be initialized before they are passed to the invoked method. They are considered initialized for the code following the invocation.
- All Out arguments must be written before the method is exited. An error is produced if one or more Out arguments is not written.
- Since an Out argument must be written, and its value is passed to the calling entity, only variables can be assigned to an Out argument. Parameters, the output of a calculation, etc., are not allowed.
- Classes cannot be used as Out arguments.

# Directions of Method Arguments

Since ASCET 6.0, the attribute Direction is available for method arguments. This attribute can be set in the [Arguments](BDE_Arguments_Tab.md) tab of the signature editor. The argument direction determines access semantic for the argument as well as the way parameters are passed. The latter can be different for value types and reference types (see [Value Types and Reference Types](IntroductionEnglishUS.chm::/INT_ValueTypes_ReferenceTypes.htm))

Available directions and their properties are summarized in the following table.

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
<td class="hcp2" colspan="1" rowspan="2">
<p class="tablehead">Argument direction</p></td>
<td class="hcp2" colspan="1" rowspan="2">
<p class="tablehead">Access semantic</p></td>
<td class="hcp2" colspan="2" rowspan="1">
<p class="tablehead">Parameter Passing </p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">value types</p></td>
<td class="hcp2">
<p class="tableheadeng">reference types</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">In</p></td>
<td class="hcp2">
<p class="tabledefault">read only</p></td>
<td class="hcp2">
<p class="tabledefault">by value</p></td>
<td class="hcp2">
<p class="tabledefault">by reference</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Out</p></td>
<td class="hcp2">
<p class="tabledefault">write only</p></td>
<td class="hcp2">
<p class="tabledefault">by reference</p></td>
<td class="hcp2">
<p class="tabledefault">by reference</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">InOut</p></td>
<td class="hcp2">
<p class="tabledefault">read and write</p></td>
<td class="hcp2">
<p class="tabledefault">by reference</p></td>
<td class="hcp2">
<p class="tabledefault">by reference</p></td></tr>
</table>

The following must be kept in mind when setting the direction:

##### [In](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

##### [InOut](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

##### [Out](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

See also

[Arguments Tab](BDE_Arguments_Tab.md)

[Value Types and Reference Types](IntroductionEnglishUS.chm::/INT_ValueTypes_ReferenceTypes.htm)

[Adding an Argument to the Method](Addargument.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
