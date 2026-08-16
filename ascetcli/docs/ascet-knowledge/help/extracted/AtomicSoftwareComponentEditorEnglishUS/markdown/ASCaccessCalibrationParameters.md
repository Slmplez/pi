- Parameters can be mapped as shown in the following table.

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng"> </p></td>
<td class="hcp3">
<p class="tableheadeng">mapping</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">scalar parameters</p></td>
<td class="hcp3">
<p class="tabledefaulteng">to scalar elements of calibration interfaces</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">to scalar elements of complex elements (records) 
 in calibration interfaces</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">composite parameters (arrays)</p></td>
<td class="hcp3">
<p class="tabledefaulteng">to composite elements (arrays) of calibration 
 interfaces</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">to composite elements of complex elements (records) 
 in calibration interfaces</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">complex parameters (records)</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">to complex elements (records) in calibration interfaces</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">to complex elements of complex elements (records) 
 in calibration interfaces</p></td></tr>
</table>

- A scalar parameter must be mapped to a scalar element of compatible type.

| Column 1 | Column 2 |
| --- | --- |
| parameter type | AUTOSAR element type |
| Continuous (cont) | cont / limitInt / wrapInt / sdisc / udisc |
| Limited Integer (limitInt) | limitInt / wrapInt |
| Wrap-Around Integer (wrapInt) | wrapInt |
| Signed Discrete (sdisc) | cont / limitInt / wrapInt / sdisc / udisc |
| Unsigned Discrete (udisc) | cont / limitInt / wrapInt / sdisc / udisc |
| Logic (log) | log |
| Enumeration (enum) | Enumeration of the same type |

When you map a scalar parameter to an element of compatible, but non-identical type, a warning (WMdl635) is issued during code generation.

When you map a scalar parameter to an element of incompatible type, an error (MMdl635) is issued during code generation.

- A composite parameter (array) must be mapped to an array of identical size, data type and implementation.

Otherwise, the mapping is indicated as invalid, and an error (MMdl635) is issued during code generation.

- A complex parameter must be mapped to a record of identical type and implementation.

Otherwise, the mapping is indicated as invalid, and an error (MMdl635) is issued during code generation.

1. Do one of the following:
1. Click on the Auto-Mapping button.

- Open the Mapping menu and select Auto-Mapping.

- Right-click in the Parameter Mapping view and select Auto-Mapping from the context menu.

All imported parameters and calibration parameters (including elements of records in the calibration interface) with identical element name and type are mapped. Names of interfaces or records are not considered. The results are shown in the Mapping field.

The mapped imported parameter and calibration parameter are removed from the upper table.

1. Double-click in a cell in the Calibration Parameter column.
1. Select a calibration parameter.

The mapping is performed. The results are shown in the Mapping field.

The mapped imported parameter and calibration parameter are removed from the upper table.

1. If necessary, click on ![](button_openList.gif) to show the upper table.
1. In the Imported Parameter column of the upper table, select an imported parameter.
1. In the Calibration Parameter column, select a calibration parameter.

The ![](buttonMapCalprm.gif) button becomes available if the selected elements can be mapped.

1. Click on the ![](buttonMapCalprm.gif) button to map the selected elements.

Or

1. Drag a message from the Messages column and drop it onto a suitable element in the Variables column.

The mapping is performed. The results are shown in the Mapping field.

The mapped imported parameter and calibration parameter are removed from the upper table.

1. In the Mapping field, Imported Parameter or Calibration Parameter column, select a mapped element.
1. Do one of the following:
1. Open the context menu or the Mapping menu and select Remove.
1. Press Delete.

1. Double-click a cell in the Calibration Parameter column and select <None>.

The mapping is removed. The imported parameter and the calibration parameter reappear in the upper table.

# Accessing Calibration Parameters

To access calibration parameters, proceed as follows.

1. [Specify the required Calibration interface prototype(s)](ASCspecifyCalibrationInterfacePrototype.md).
1. Open the Parameter Mapping tab.
1. If necessary, open the Mapping menu and select Update to import changes in the classes/modules and calibration interfaces into the SWC.
1. If desired, [filter](ASC_Filter_MappingViews.md) the columns.
1. To use automatic mapping, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.
1. To map imported parameters and calibration parameters manually in the Mapping field, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.
1. To map imported parameters and calibration parameters manually in the upper table (hidden by default), proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->.
1. If desired, [import](ASC_ImportMessageParameterMappings.md) an existing mapping.
1. To remove a mapping, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->.

The middle column in the Mapping field shows the mapping status: ![](icon_info.gif) - unmapped / ![](icon_OK.gif) - mapping is valid / ![](icon_wrong.gif) - mapping is invalid.

See also [Example: Accessing Calibration Parameters](ASC_ExampleAccessingCalibrationParameters.md)

See also

[Example: Accessing Calibration Parameters](ASC_ExampleAccessingCalibrationParameters.md)

[Parameter Mapping View](ASCParameterMappingView.md)

[Filtering the Mapping Views](ASC_Filter_MappingViews.md)

[Importing Message/Parameter Mappings](ASC_ImportMessageParameterMappings.md)

[Specifying a Calibration Interface Prototype](ASCspecifyCalibrationInterfacePrototype.md)

[Calibration](ASCcalibration.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
