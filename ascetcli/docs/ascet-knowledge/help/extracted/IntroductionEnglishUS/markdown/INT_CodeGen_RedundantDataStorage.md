The exported send message msg and the local variable cont are marked as redundant.

![](RDS_example1_b.gif)

They are implemented as follows:

![](RDS_example1_a.gif)

The complement service is defined as follows:

complement|s16|s16=complement_%t1%(%i1%)

In the generated *.h file, the elements are defined as follows (the complements are set in bold):

/*----Local variables object structure -----------------------------*/

struct MODULE_BLOCK_DIAGRAM_IMPL_Obj {

sint16_Obj *cont;

sint16_Obj *_ASCET_copy_cont;

};

/*----Imported/Exported variables object structure -----------------*/

typedef struct {

sint16_Obj *msg;

sint16_Obj *_ASCET_copy_msg;

} MODULE_BLOCK_DIAGRAM_IMPL_Class;

The local variable cont_local is marked as redundant and implemented as sint16. An assignment is specified:

![](RDS_example2_a.gif)

The following code is generated for the assignment. The assignment to the temporary variable is limited to the sint16 value range.

sint16 _t1sint16;

_t1sint16 = (MODULE_IMPLinstance->contPar->val <= 32766) ? (MODULE_IMPLinstance->contPar->val + 1) : 32767;

MODULE_IMPLinstance->cont_local->val = _t1sint16;

MODULE_IMPLinstance->_ASCET_copy_cont_local->val = complementService(_t1sint16);

The local variable cont_local is marked as redundant and implemented as sint16. A direct assignment is specified:

![](RDS_example2_b.gif)

The following code is generated for the assignment:

MODULE_IMPLinstance->cont->val = MODULE_IMPLinstance->contPar->val;

MODULE_IMPLinstance->_ASCET_copy_cont->val = complementService(MODULE_IMPLinstance->contPar->val);

The local variable cont is marked as redundant and implemented as sint16. A simple verify operation is specified:

![](RDS_example3_a.gif) / log_scalar = cont.verify();

The following code is generated for the operation:

MODULE_IMPLinstance->log_scalar->val = (complementService(MODULE_IMPLinstance->cont->val) == MODULE_IMPLinstance->_ASCET_copy_cont->val);

The array variable array is marked as redundant and implemented as uint32. A simple verify operation is specified:

![](RDS_example4_a.gif) / log_array = array.verify();

The following code is generated for the operation:

uint8 _t1uint8;

uint8 _t2uint8;

_t1uint8 = true;

if (_t1uint8)

{

for(_t2uint8 = 0U;_t2uint8 < 4U;_t2uint8++)

{

{

_t1uint8 = _t1uint8 && (complementService(Vec_uint32_getAtProtected (MODULE_IMPLinstance->array, _t2uint8, "variable <MODULE_IMPLinstance->array> in component <Module::Impl>")) == Vec_uint32_getAtProtected (MODULE_IMPLinstance->_ASCET_copy_array, _t2uint8, "variable <MODULE_IMPLinstance->_ASCET_copy_array> in component <Module::Impl>"));

}

}

}

MODULE_IMPLinstance->log_array->val = _t1uint8;

The matrix variable matrix is marked as redundant and implemented as sint16. A simple verify operation is specified:

![](RDS_example4_b.gif) / log_matrix = matrix.verify();

The following code is generated for the operation:

uint8 _t1uint8;

uint8 _t2uint8;

uint8 _t3uint8;

_t1uint8 = true;

if (_t1uint8)

{

for(_t2uint8 = 0U;_t2uint8 < 3U;_t2uint8++)

{

{

for(_t3uint8 = 0U;_t3uint8 < 3U;_t3uint8++)

{

{

_t1uint8 = _t1uint8 && (complementService(Mat_sint16_getAtProtected (MODULE_IMPLinstance->matrix, _t2uint8, _t3uint8, "variable <MODULE_IMPLinstance->matrix> in component <Module::Impl>")) == Mat_uint16_getAtProtected (MODULE_IMPLinstance->_ASCET_copy_matrix, _t2uint8, _t3uint8, "variable <MODULE_IMPLinstance->_ASCET_copy_matrix> in component <Module::Impl>"));

}

}

}

}

}

MODULE_BLOCK_DIAGRAM_1_IMPLinstance->log_matrix->val = _t1uint8;

The local variable cont is marked as redundant and implemented as sint16. The array variable array is marked as redundant and implemented as uint32.

The following verify operations are specified:

![](RDS_example3_a.gif)

![](RDS_example4_a.gif)

Code is generated for the PC target and Physical experiment. The following code is generated for the verify operations:

MODULE_instance->out_log->val = true;

MODULE_instance->log_array->val = true;

# Code Generation with Redundant Data Storage

All C code examples have been generated for the PC target with Implementation Experiment code generator.

If the code generation option [Use Redundant Data Storage](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) is activated, and code is generated for the Implementation Experiment or for Object Based Controller Implementation, the following happens:

- Each element marked as redundant is stored in a second place, the complement representation.

The implementation data type of the complement is set via the <result type> in the complement service. If no <result type> is given, the implementation data type is an unsigned integer type of the same bit size as the original element, especially for originals with a signed implementation data type.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

- Each assignment to an element marked as redundant is replaced by an assignment to a temporary variable, followed by an assignment to the original representation.

The complementary value (calculated via a [complement service](INT_ComplementService_RDS.md)) of the temporary variable is assigned to the element's complement representation.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

The temporary variable is omitted for very simple assignments, e.g., the direct assignment of a parameter or a constant.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

- Each verify operation for a scalar element x is replaced by (complement(x) == xcopy), where x is the original and xcopy the complement. The complement function is the complement service for the type of x.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

- Each verify operation for an array or matrix marked as redundant is replaced by a for loop construction, which verifies all elements of the array/matrix in the same way as scalars.

If code is generated for an ASCET-SE target, the following happens in addition to the list above:

- All pointers that are dereferenced within the code generated for a verify operation have to be checked before dereferencing. The check is done by taking care that the pointer is one of the instances known to ASCET.

If the code generation option [Use Redundant Data Storage](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) is not activated, or if code is generated for the Physical or Quantized Physical experiment, the following happens:

- Elements marked as redundant are treaded as elements not marked as redundant.
- All verify operations are replaced by true.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a7'); //-->

See also

[Redundant Data Storage](INT_RedundantDataStorage.md)

[Memory Classes for Redundant Data Storage](INT_MemoryClasses_RedundantDataStorage.md)

[Complement Service for Redundant Data Storage](INT_ComplementService_RDS.md)

[Block Diagram Editor - Using the Verify Operator](BlockDiagramEditorEnglishUS.chm::/BDE_UseVerifyOperator.htm)

[ESDL Editor - Verify Operation](ESDLEditorEnglishUS.chm::/ESDL_VerifyOperator.htm)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)

[Temporary Variables](INT_temporary_variables.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
