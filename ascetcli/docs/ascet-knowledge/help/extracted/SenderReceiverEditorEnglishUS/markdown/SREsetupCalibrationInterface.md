1. In the Elements palette or toolbar, click on the button (![](button_para_l.gif) ![](button_para_i.gif) ![](button_para_w.gif) ![](button_para_s.gif) ![](button_para_u.gif) ![](button_para_c.gif) / ![](buttonParameter.gif)) for the parameter you want to create.

The properties editor opens.

1. Edit the element properties and click OK.

1. In the Elements palette, click on the ![](button_para_e.gif) Enumeration Parameter button.
1. Select the enumeration you want from the combo box.
1. Click OK to close the selection window.
1. Edit the enumeration properties and click OK.

Alternatively, you can add an enumeration the same way as described in [Including a Component as Complex Element](AtomicSoftwareComponentEditorEnglishUS.chm::/ascincludecomponent.htm).

1. In the Elements palette or toolbar, click on the ![](buttonArray.gif) Array button.

The properties editor opens.

1. In the X field, enter the maximum size of the array.

Arrays with variant or variable size are not available in calibration interfaces.

1. Adjust the other element properties according to your needs and click OK.

1. In the Insert menu, select Component.
1. Click on the ![](buttonInsertComponent.gif) Insert Component button.
1. From the 1 Database or 1 Workspace list, select the record you want to add.
1. Click OK to add the record.

As an alternative to adding records and enumerations the way described here, you can drag them from the Component Manager onto the Outline tab of the Calibration interface editor.

# Setting Up a Calibration Interface

A Calibration interface can contain scalar parameters, enumeration parameters, and record parameters.

1. [Open the Calibration interface editor](SREopenSRIEditor.md).
1. [Add a scalar parameter.](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->
1. [Add an enumeration.](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->
1. [Add an array.](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a7'); //-->
1. [Include a record.](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->
1. [Implement the calibration parameters](SREimplementCalibrationParameters.md).
1. Edit the data for the calibration parameters.

You can change the properties of an element later in the properties editor; see [Editing Element Properties](ElementEditorEnglishUS.chm::/EEd_Overview.htm).

See also

[Opening an AUTOSAR Interface Editor](SREopenSRIEditor.md)

[Implementing Calibration Parameters](SREimplementCalibrationParameters.md)

[Editing Element Properties](ElementEditorEnglishUS.chm::/EEd_Overview.htm)

[Data Editor - Editing Scalar Types](DataEditorEnglishUS.chm::/DEd_EditingScalarTypes.htm)

[Data Editor - Editing Combined Types](DataEditorEnglishUS.chm::/DEd_EditingCombinedTypes.htm)

[Showing and Hiding Confirmation Dialog Windows](componentmanagerenglishus.chm::/CM_Showing_and_Hiding_Confirmation_Dialog_Windows.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
