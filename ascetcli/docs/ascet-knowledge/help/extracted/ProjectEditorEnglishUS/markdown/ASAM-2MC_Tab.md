The unit kg_per_m*m is assigned to the air_nominal variable.

![](images/asap2_unit_1.gif)

The ident formula is assigned in the implementation editor. The table lists the relevant parts of the ASAM-MCD-2MC file without and with Formulas with Unit.

| Column 1 | Column 2 |
| --- | --- |
| deactivated | activated |
| ... /begin MEASUREMENT air_nominal "" FLOAT64_IEEE ident 1 100 -1.e+037 1.e+037 /begin IF_DATA E_TARGET KP_BLOB 0xFFFFFFFF 0xFFFFFFFF 2 1001 1 1001 0 /end IF_DATA /end MEASUREMENT ... /begin COMPU_METHOD ident "" RAT_FUNC "%12.4" "" COEFFS 0 1 0 0 0 1 /end COMPU_METHOD ... | ... /begin MEASUREMENT air_nominal "" FLOAT64_IEEE ident_kg_per_mm 1 100 -1.e+037 1.e+037 /begin IF_DATA E_TARGET KP_BLOB 0xFFFFFFFF 0xFFFFFFFF 2 1001 1 1001 0 /end IF_DATA /end MEASUREMENT ... /begin COMPU_METHOD ident_kg_per_mm "" RAT_FUNC "%12.4" "kg_per_m*m" COEFFS 0 1 0 0 0 1 /end COMPU_METHOD ... |

# ASAM-2MC Node

The ASAM-2MC node offers the following settings:

##### ROM Code

Toggles the generation of ROM code for experimental targets.

When activated, the *.cod file contains both ROM and RAM code to enable stand-alone operation (see the ASCET-RP user’s guide). An executable file (*.cod) is generated for the experimental target.

This option is not supported for microcontroller targets.

##### Formulas With Unit

Defines whether the unit specified in the Properties editor of an element is added (activated) to the formula name in the ASAM-MCD-2MC file or not (deactivated).

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

##### Suppress exported Parameters

Determines whether exported parameters are suppressed (activated) during ASAM-MCD-2MC generation or not (deactivated).

Some compilers optimize the access to exported parameters in the C code by replacing them with their values. When such parameters are calibrated, inconsistencies between exporting and importing components can occur. The option prohibits the calibration of such parameters.

##### Suppress exported Elements

Determines whether the exported elements of prototype components are ignored (activated) during ASAM-MCD-2MC generation or not (deactivated).

The ASCET-SE user's guide contains further information on prototypes.

##### Suppress grouping Information

Determines whether the structuring of measurement and calibration variables via the GROUP and SUB_GROUP keywords during ASAM-MCD-2MC generation is inserted (deactivated, default) or suppressed (activated).

##### Suppress function Information

Determines whether the structuring of measurement and calibration variables via the FUNCTION and SUB_FUNCTION keywords during ASAM-MCD-2MC generation is inserted (deactivated, default) or suppressed (activated).

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
