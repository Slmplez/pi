- A reference is defined in a multi-instance class, and it is initialized through a reference to that class.
- aRef and bRef are uninitialized references; aRef = bRef is set in processA, and bRef = aRef is set in processB
- aRef = (a > b) ? aRef : bRef; with a always larger than b due to intervals, so that this assignment effectively is aRef = aRef

# Initialization of Explicit References

Explicit references must be initialized before they are used.

| Column 1 | Column 2 |
| --- | --- |
| Reference Type | must be initialized with |
| array | array of identical or larger size (a warning is issued in the latter case) |
| matrix | matrix of identical x size and y size |
| normal or fixed characteristic line/map | normal or fixed characteristic line/map of kind "variable" and identical dimension (you cannot map a characteristic line to a map or vice versa) type (you cannot map, e.g., a normal characteristic line to a fixed characteristic line) x max size and - for maps - y max size implementation (for implementation experiments) interpolation routine (for ASCET-SE targets) |
| normal class (block diagram, ESDL, C code) | another instance of the same class using the same implementation |
| state machine | another instance of the same state machine using the same implementation |
| Boolean table | another instance of the same Boolean table using the same implementation |
| conditional table | another instance of the same conditional table using the same implementation |
| record | another instance of the same record using the same implementation |

To ensure reference initialization, ASCET requires, by default, that the element specified as Reference must be [mapped](DataEditorEnglishUS.chm::/DEd_MappingReference.htm) to an element that is not a reference itself. The mapped element must be an element in the same component, and its type must match the reference (see the table above). The [scope](INT_the_scope_of_elements.md) of the mapped element depends on the scope of the reference:

- Local references can be mapped to elements of any scope (local, imported, exported).
- Exported references can be mapped to imported or exported elements only.
- Imported references cannot be mapped; map the associated exported reference instead.

Explicit references must not be mapped to arrays, matrices or records used as messages. If they are, an error (MMdl3024) is issued during code generation: Cannot use the address of a message object <name>.

The mapping is stored with the currently active data set of the component.

In ASCET versions prior to V6.2, the [mapping](DataEditorEnglishUS.chm::/DEd_MappingReference.htm) was the only possibility to initialize explicit references. However, to allow customer tool chains to generate data structures and initial values, ASCET V6.2 or higher offers the possibility to generate code for unmapped explicit references. By default, this possibility is deactivated; it can be activated in the context of a project, via the Allow References without Init Value [code generation option](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm).

If the Allow References without Init Value option is activated, the user is the sole responsible for initialization of references.

If code is generated while Allow References without Init Value is deactivated, an error is issued when an uninitialized reference is found:

GLm3 - Reference init value undefined or not available. Please specify an internal init value for <reference name>.

If code is generated while Allow References without Init Value is activated, a warning is issued if an uninitialized reference is found:

WMdl822 - read access to reference without init value "<reference name>" possibly prior to initialization of reference

By default, this warning is [promoted to an error](ComponentManagerEnglishUS.chm::/Promoting_Information_and_Warnings.htm).

In addition, the global analysis, i.e. the analysis of the entire project context, issues an error for an uninitialized reference that is read:

MMdl83 - read access to a definitely uninitialized reference "<reference name>"

The absence of the error does not prove that the reference is always initialized before use. The [following list](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> contains three examples for uninitialized references that remain undiscovered.

See also [Using References Without Initialization](INT_UseReferencesWithoutInit.md).

See also

[Explicit References](INT_ExplicitReferences.md)

[Mapping a Reference](DataEditorEnglishUS.chm::/DEd_MappingReference.htm)

[Using References Without Initialization](INT_UseReferencesWithoutInit.md)

[The Scope of Elements](INT_the_scope_of_elements.md)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Component Manager - Promoting Information and Warnings](ComponentManagerEnglishUS.chm::/Promoting_Information_and_Warnings.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
