# Scalar Types - Summary

The basic scalar types [continuous](INT_scalar_types__continuous.md), [limited integer](INT_ScalarTypes_LimitedInteger.md), [wrap-around integer](INT_ScalarTypes_WrapAroundInteger.md), [signed discrete](INT_scalar_types__signed_discrete.md), [unsigned discrete](INT_scalar_types__unsigned_discrete.md) and [logical](INT_scalar_types__logical.md) are value types. Whenever an element of such a type is used, not the element itself as an object, but its value is used. Automatic typecasting between the arithmetic types cont, sdisc and udisc is performed if necessary.

Prior to ASCET V6.4, only signed discrete and unsigned discrete were available as integer types. However, these types have several disadvantages. <!-- kadovTextPopupInit('a1'); //-->

- signed discrete and unsigned discrete behave differently in different experiments.

- In physical experiments (see [Build Node (Project Properties)](ProjectEditorEnglishUS.chm::/Build_Options.htm)), signed discrete and unsigned discrete are always 32 bit; no overflow protection or limitation is applied.
- In implementation experiments, limitation is applied if the Limit Assignments option in the implementation editor is activated. Overflow protection is applied if specified (i.e. if Limit to maximum bit length is enabled or there is more than one operator (excluding Min, Max, Mux).

signed discrete and unsigned discrete behave the same way as continuous elements with identical implementation (excepting usage as array/matrix index, switch/case expression, modulo operands, etc.)

- During implementation code generation, an error (MIa5) is issued if signed discrete/unsigned discrete and continuous implemented as real* are mixed in an operation or assignment.
- If no limitation in case of overflow is specified (see [Setting the Overflow Handling](ImplementationEditorEnglishUS.chm::/set_overflow_handling.htm)), and several operators are used in one computation, the behavior of signed discrete and unsigned discrete can be unexpected; a warning (WIle365896) is issued.
- The behavior of signed discrete and unsigned discrete depends on the Maximum bit Length (int) option (see [Integer Arithmetic Node](ProjectEditorEnglishUS.chm::/fixedpoint.htm)).

To avoid these disadvantages, the limited integer and wrap-around integer types were introduced.

With the introduction of the limited integer and wrap-around integer types, the types signed discrete and unsigned discrete have become deprecated. To use them, you must activate the [editor option](ComponentManagerEnglishUS.chm::/cm_options_for_editors.htm) Use signed/unsigned discrete types. You can export components that use the limited integer and wrap-around integer types only in AMD format V6.4 and higher. An AMD format V6.3 or older will result in an export error.

Like complex types (classes), each basic type has an interface, i.e. methods to access it. For the basic model types these methods are fixed, the interface cannot be modified.

Scalar types have two simple access methods for the value stored in an element of the basic scalar type, i.e. for writing a new value to and reading the current value from the element:

- set (type a): This method takes one value, e.g. the value a, and overwrites the value of the element with that value. If the type of the value does not fit to the type of the element, a type conversion is performed automatically.
- get(): This method returns the current value of the element. The value returned is of the same type as the element itself.

Accessory methods in basic types are invoked automatically when an element name is used in an expression or when an assignment is performed. They do not have to be coded explicitly.

See also

[Scalar Types: Continuous](INT_scalar_types__continuous.md)

[Scalar Types: Limited Integer](INT_ScalarTypes_LimitedInteger.md)

[Scalar Types: Wrap-Around Integer](INT_ScalarTypes_WrapAroundInteger.md)

[Scalar Types: Logical](INT_scalar_types__logical.md)

[Scalar Types: Signed Discrete](INT_scalar_types__signed_discrete.md)

[Scalar Types: Unsigned Discrete](INT_scalar_types__unsigned_discrete.md)

[Converting sdisc/udisc to limitInt/wrapInt](INT_Convert_SdiscUdisc_to_limitInt_wrapInt.md)

[Setting the Overflow Handling](ImplementationEditorEnglishUS.chm::/set_overflow_handling.htm)

[Build Node (Project Properties)](ProjectEditorEnglishUS.chm::/Build_Options.htm)

[Integer Arithmetic Node](ProjectEditorEnglishUS.chm::/fixedpoint.htm)

[Editor Options](ComponentManagerEnglishUS.chm::/cm_options_for_editors.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
