- type icon ![](images/icon_info.gif) information ![](icon_importproblem_warn1.gif) warning ![](icon_importproblem_error1.gif) error ![](icon_promotedwarning1.gif) information promoted to warning ![](icon_promotederror1.gif) information promoted to error ![](icon_promotederror2.gif) warning promoted to error

Hidden messages are indicated by paler icons, e.g.![](icon_hiddenmsg1.gif), ![](icon_hiddenmsg2.gif), etc.

- global icon - indicates whether global definitions are available and in use ![](images/icon_globalUsed.gif) global definition present and in use ![](images/icon_globalUnused.gif) global definition present, but disabled (none) no global definition present
- message identifier and text

- Select All

Selects all messages displayed in the list field.

- Copy to Clipboard

Copies the selected messages and their settings to the clipboard.

- Ignore Global Definition

If selected, global definitions for this message are ignored.

- Use Global Definition

If selected, global definitions for this message override project-specific definitions.

- Hide

If selected, this message is hidden in the ASCET monitor window.

- Show

If selected, this message is shown in the ASCET monitor window.

- Promote to warning

If selected, this information is treated like a warning.

- Promote to error

If selected, this information or warning is treated like an error.

- Revoke Promotion

Resets this message to the state originally specified by the system.

# CodeGen Message Configuration Window (P)

The project-specific CodeGen Message Configuration window contains the following elements:

- List field

This field can display all information, warnings and error messages. You control the display using the options in the Message Filter box. The list is sorted alphabetically according to type; a list entry consists of [three elements](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.

- [context menu of list entries](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

- Import Message Configuration from XML File and Export Message Configuration to XML File buttons

Start import and export of message configuration.

- ![](BUTTON.GIF) Import Message Configuration from XML File

- ![](BUTTON.GIF) Export Message Configuration into XML File

- ![](BUTTON.GIF) Reset All

Resets all messages to the state originally specified by the system.

- Message Filter field

You use the options in this field to set up the display in the list field.

- Type field with the options Information, Warning and Error

These options enable/disable the display of the relevant type of message globally. The following options specify the details.

- Normal

Enables/disables the display of unprocessed messages (not hidden, not promoted) of the selected types.

- Hidden

Enables/disables the display of hidden messages of the selected types.

- Promoted to Warning and Promoted to Error

Enables/disables the display of messages promoted to warnings or error messages of the selected types.

- Global Defined

Enables/disables the display of messages that are promoted on a global level.

See also

[List of Error Messages](List_of_Error_Messages.md)

[List of Information Messages](List_of_Information_Messages.md)

[List of Warning Messages](List_of_Warning_Messages.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
