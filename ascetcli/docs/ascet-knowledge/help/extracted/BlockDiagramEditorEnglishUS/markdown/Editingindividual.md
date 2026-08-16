[Sequence Calls](BDE_SequenceCalls.md)

[Block-Local Sequence Calls](BDE_BlockLocal_SequenceCalls.md)

[Editing the Sequence Call in the Sequence Editor](EditSequence.md)

[Automatically Assigning Individual Sequence Calls](Assignindividual.md)

[Incrementing/Decrementing Individual Sequence Calls](Incrementordecrement.md)

[Using Numbers Already Assigned](Usenumbers.md)

[Resetting an Individual Sequence Call](Resetindividual.md)

[Moving Between Sequence Calls](Movesequence.md)

[Changing the Visibility of Individuals Sequence Calls](Changevisibility.md)

[Creating a Sequence of Protected Sequence Calls](Createsequence.md)

[Editing the Sequence Call in the Sequence Editor](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCeditSequenceCalls.htm)

[Automatically Assigning Individual Sequence Calls](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCassignindividual.htm)[Assignindividual.md](Assignindividual.md)

[Incrementing/Decrementing Individual Sequence Calls](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCIncrementordecrement.htm)

[Using Numbers Already Assigned](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCUsenumbers.htm)

[Resetting an Individual Sequence Call](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCResetindividual.htm)

[Moving Between Sequence Calls](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCMovesequence.htm)

[Changing the Visibility of Individuals Sequence Calls](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCChangevisibility.htm)

[Creating a Sequence of Protected Sequence Calls](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCCreatesequence.htm)

# Sequence Editor

The Sequence Editor is used to edit and configure individual sequence calls, connectors and block-local sequence calls.

This editor contains the following elements:

- Sequence Number
- ![](BUTTON.GIF) Next free

Not available for connectors and block-local sequence calls.

This is used to set the next free number in accordance with specific rules.

- Method/Process Name combo box
- Sequence Shift Offset
- Sequence Step size
- Use Gaps
- ![](BUTTON.GIF) OK
- ![](BUTTON.GIF) Cancel

Closes the Sequence Editor without accepting the changes.

See also

[Block Diagram Editor links](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

[Software Component Editor links](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

[Sequencing Options](ComponentManagerEnglishUS.chm::/SequencingOptions.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
