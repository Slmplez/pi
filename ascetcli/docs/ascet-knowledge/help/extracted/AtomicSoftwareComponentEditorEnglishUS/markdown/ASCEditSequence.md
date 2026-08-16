- Only whole multiples of the value in the Sequence Step Size field (corresponds to Sequence Step Size in the Sequencing node of the ASCET option window,see [Sequencing Options](ComponentManagerEnglishUS.chm::/CM_SequencingNode.htm))are taken into consideration. If, for example, the value 5 is set, only the numbers 5, 10, 15, 20, ... are checked.
- If the Use Gaps option is activated, any gaps between existing sequence numbers are filled. The first condition still applies; gaps which are not whole multiples of the value in the Sequence Step Size box are not filled.

Example:

If, e.g. the numbers 1–3, 5–9 and 11 have already been assigned and 5 has been specified in the Sequence Step Size box, 10 is assigned, not 4.

The system saves the sequence number last assigned. Gaps below this number are not filled! When you leave the editor or reset one ([Resetting an Individual Sequence Call](ASCResetindividual.md)) or several sequence calls ([Resetting Several Sequence Calls](ASCResetSequence.md)), the number saved is reset, automatic numbering starts again at 1.

1. If the Use Gaps option is not activated, a search is carried out for the next whole multiple of the value in the Sequence Step Size field after the highest available number.

In the above example (1–3, 5–9 and 11 assigned), 15 is assigned.

# Editing a Sequence Call in the Sequence Editor

To edit a sequence call, block-local sequence call, or connector, in the Sequence Editor, proceed as follows:

1. Right-click a sequence call in the drawing area and select Edit from the context menu.
1. From the Method Name combo box, select the runnable/method for the sequence call.
1. Do one of the following:
1. In the Sequence Shift Offset field, enter the offset value for a sequence shift.
1. In the Sequence Step Size field, enter the step size for automatic determination of the sequence number.
1. Activate the Use Gaps option if gaps between existing numbers are to be taken into consideration in the automatic determination of sequence numbers.
1. Click OK.

A check is carried out to see whether the set combination of number and runnable/method has already been assigned. If not, the combination is assigned to the sequence call and displayed in the block diagram.

Sequence Shift Offset, Sequence Step Size and Use Gaps are accepted in the ASCET option window.

The [following rules](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> apply for determining the number using Next free.

See also

[Sequence Calls](ascsequencecalls.md)

[Block-Local Sequence Calls](asc_blocklocalsequencecalls.md)

[Sequencing Options](ComponentManagerEnglishUS.chm::/CM_SequencingNode.htm)

[Sequence Editor](BlockDiagramEditorEnglishUS.chm::/Editingindividual.htm)

[Automatically Assigning Individual Sequence Calls](ASCassignindividual.md)

[Incrementing/Decrementing Individual Sequence Calls](ASCIncrementordecrement.md)

[Resetting an Individual Sequence Call](ASCResetindividual.md)

[Resetting Several Sequence Calls](ASCResetSequence.md)

[Using Existing Sequence Numbers](ascusenumbers.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
