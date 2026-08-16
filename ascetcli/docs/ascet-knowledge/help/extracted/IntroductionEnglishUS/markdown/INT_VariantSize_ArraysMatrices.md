- At least one value of the system constant must be included in the interval [1..maxSize].
- If the array/matrix scope is exported or imported, the scope of the system constant must be exported or imported, too.
- If the value range of the system constant includes values < 1 or > maxSize, a check is generated that issues an error message if the system constant value is outside the interval [1..maxSize]:

#if (SC_name < 1 || SC_name > maxSize)

#error The system constant SC_name must be between 1 and maxSize, because it is used as an array/matrix size of matrix.

#endif

- In addition, a warning of type WMdl651 is issued during code generation:

Possible type mismatch in array max size: <name> and <[1,maxSize]> - will be checked at compile time

- The max. size and the current size of the array/matrix are set to the max. size defined in the model during the initialization.
- The access methods for array/matrix lengths will return the value of the system constant.
- The [compatibility check for arrays/matrices](ins_compatibilitycheck_arraysmatrices.md) changes: arrays/matrixes are only compatible if they use the same system constant.

This is because it is not possible to ensure that different system constants always have the same value if they can be changed at run time.

# Variant Size for Arrays and Matrices

The size of an array or matrix is determined when the element is created. In addition, ASCET allows the determination of variants in array/matrix sizes via system constants.

The following rules apply:

- Only system constants in the same component as the array/matrix can be used for variant size determination.
- The system constants used for variant size determination must be of type [limitInt](INT_ScalarTypes_LimitedInteger.md), [wrapInt](INT_ScalarTypes_WrapAroundInteger.md), [sdisc](INT_scalar_types__signed_discrete.md), [udisc](INT_scalar_types__unsigned_discrete.md) or [enumeration](INT_enumeration.md).
- For an array/matrix of scope exported, system constants of [scope](INT_the_scope_of_elements.md) exported or imported can be used for variant size determination.
- For an array/matrix of scope local, system constants of scope local or exported or imported can be used for variant size determination.

If you use an array or matrix that has at least one dimension with a system constant size, keep the following in mind:

- Index protection (see [Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm), Protected Vector Indices) uses the value of the system constant instead of the max. size.

- If the Resolve System Constants option in the ASCET options window, Targets\<target>\Build node of the selected target, is set to Generation Time, the initial value of the system constant is used to transform the variant-size array/matrix into a fixed-size array/matrix.
- If the Resolve System Constants option in the ASCET options window, Targets\<target>\Build node of the selected target, is set to Compile Time, the [following constraints](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> are checked.

- If the Resolve System Constants option in the ASCET options window, Targets\<target>\Build node of the selected target, is set to Run Time, the [following](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //--> happens.

- Models that use normal arrays/matrices with variant size can only be exported to ASCET V6.2.0 or newer.
- Models that use arrays/matrices with variant size as messages can only be exported to ASCET V6.4.0 or newer.

See also

[Array](INT_Array.md)

[Matrix](INT_matrix.md)

[Creating an Array or Matrix](BlockDiagramEditorEnglishUS.chm::/CreateArray.htm)

[Messages](INT_messages.md)

[Variable Size for Arrays and Matrices](INT_VariableSize_ArraysMatrices.md)

[Scalar Types](INT_scalar_summary.md)

[Enumeration](INT_enumeration.md)

[The Scope of Elements](INT_the_scope_of_elements.md)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)

[Properties Editor - Editing the Configuration of a Composite Element](ElementEditorEnglishUS.chm::/eed_editconfiguration_compositeelement.htm)

[ASCET Options - Targets Node](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all texts</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all texts'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
