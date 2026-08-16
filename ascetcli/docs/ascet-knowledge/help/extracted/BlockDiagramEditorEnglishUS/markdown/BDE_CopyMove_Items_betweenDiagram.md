1. In the Edit menu, select Cut or Copy.
1. Press Ctrl + x or Ctrl + c.
1. Click on ![](images/buttonCut.gif) Cut or ![](images/buttonCopy.gif) Copy.

1. Click in the drawing area of the target component.
1. In the Edit menu, select Paste.
1. Press Ctrl + v.
1. Click on ![](images/buttonPaste.gif) Paste.

| Column 1 | Column 2 |
| --- | --- |
| Keep | The existing element replaces the copied element. |
| Overwrite | The copied element replaces the existing element. |
| Create New (not available for return values) | Pastes the copied element to a new element named <element name>_<n> , <n> being the lowest integer number that causes no name clash. If the renamed element causes a new name conflict, renaming is done in alphabetical order; see the example . |
| Cancel | Aborts the paste procedure. |

The Apply to the next <x> conflicts option allows you to apply your selection to all name conflicts.

If arg_1 and arg_2 are pasted to a method with an existing arg_1, the following happens:

- The names of the copied arg_1 and the existing arg_1 conflict, and the copied arg_1 is renamed to arg_2.
- Now, the names of the copied arg_2 and the newly created arg_2 (the copied arg_1) conflict, and the copied arg_2 is renamed to arg_3.

| Column 1 | Column 2 |
| --- | --- |
| Keep | The existing element replaces the copied element. Keeping an element of different type (e.g., log vs. cont, array vs. scalar) than the copied element can lead to an invalid model. |
| Overwrite | The copied element replaces the existing element. Replacing an existing element with a copied element of different type (e.g., log vs. cont, array vs. scalar) can lead to an invalid model. |
| Create New (not available for return values) | Pastes the copied element to a new element named <element name> . If the new element causes a name conflict, it is renamed to <element name>_<n> ( <n> being the lowest integer number that causes no name clash); see the example . It is strongly recommended that you use Create New . |
| Cancel | Aborts the paste procedure. |

The Apply to the next <x> conflicts option allows you to apply your selection to all type conflicts, with the exception of conflicting return values.

If arg_1 (cont) is pasted to a method with existing arguments arg_1 (log) and arg_2 (cont), the following happens:

- The types of the copied arg_1 and the existing arg_1 conflict, and the copied arg_1 is renamed to arg_2.
- Now, the names of the newly created arg_2 (the copied arg_1) and the existing arg_2 conflict, and the newly created arg_2 is renamed to arg_3.

# Copying/Moving Diagram Items Between Diagrams

To cut/copy diagram items from one diagram and paste them to another diagram, proceed as follows:

1. In the drawing area, select the diagram items you want to cut or copy.
1. To cut or copy the selected items, do [one of the following](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.
1. Open the target component and load the target diagram.
1. To paste the items, do [one of the following](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->.
1. In the Select Method window, select an existing method/process/runnable, or create a new one, and click OK.
1. In the Create new Method window, click Yes to create the new method/process/runnable and paste the diagram items.
1. In the Ignored Elements window, click Continue to paste the allowed diagram items.

The model will be invalid, due to the ignored elements. You must edit it before you can use it.

1. See also

[Copying/Moving Diagram Items in the Same Diagram](BDE_Cutcopypaste.md)

[Copying or Moving Graphical Items](BDE_CopyMove_GraphicItems.md)

[Working on Sequence Calls](BDE_WorkingOnSequenceCalls.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
