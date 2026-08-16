| Column 1 | Column 2 |
| --- | --- |
| message type | AUTOSAR element type |
| Continuous (cont) | cont / limitInt / wrapInt / sdisc / udisc |
| Limited Integer (limitInt) | limitInt / wrapInt |
| Wrap-Around Integer (wrapInt) | wrapInt |
| Signed Discrete (sdisc) | cont / limitInt / wrapInt / sdisc / udisc |
| Unsigned Discrete (udisc) | cont / limitInt / wrapInt / sdisc / udisc |
| Logic (log) | log |
| Enumeration (enum) | Enumeration of the same type |

# Message Mapping

AUTOSAR does not know the concept of ASCET messages. In case an ASCET module containing ASCET messages is used within an AUTOSAR software component, all messages must be mapped to semantically equivalent AUTOSAR elements.

For this purpose, ASCET provides a special editor in the Message Mapping view of the software component editor.

In that editor, messages can be mapped to AUTOSAR elements according to the following rules:

- Messages can be mapped as shown in the following table. internal mapping external mapping scalar messages to scalar interrunnable variables to scalar elements of SenderReceiver or NVData interfaces to scalar elements of complex interrunnable variables (records) to scalar elements of complex elements (records) in SenderReceiver or NVData interfaces composite messages (arrays) to composite interrunnable variables (arrays) to composite elements (arrays) of SenderReceiver or NVData interfaces to composite elements of complex interrunnable variables (records) to composite elements of complex elements (records) in SenderReceiver or NVData interfaces complex messages (records) to complex interrunnable variables (records) to complex elements (records) in SenderReceiver or NVData interfaces
- Scalar and composite elements of nested records (record A contains record B, which contains record C, etc.) used as SenderReceiver/NVData interface elements or interrunnable variables are available for message mapping.

Recursively nested records (record A contains record B, which contains record A) are forbidden; using them leads to a code generation error (EMake10).

- Complex elements of nested records (record A contains record B, which contains record C, etc.) used as SenderReceiver/NVData interface elements or interrunnable variables are not available for message mapping.
- A scalar message must be mapped to a scalar element of [compatible type](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

If you map a scalar message to an element of compatible, but non-identical type, a warning (WMdl635) is issued during code generation.

If you map a scalar message to an element of incompatible type, an error (MMdl635) is issued during code generation.

- A composite message (array) must be mapped to an array of identical size, data type and implementation.

Otherwise, the mapping is indicated as invalid, and an error (MMdl635) is issued during code generation.

- A complex message must be mapped to a record of identical type and implementation.
- Redundant data storage must not be activated for mapped messages.

If it is, the following error (MMdl37) is issued during code generation:

redundant data flag is set for <message>, but redundant data and mapped messages cannot be combined.

- A pure send message can only be mapped to one or more elements of SenderReceiver interfaces used as Pport (external mapping), since the message value is not used within the SWC and thus provided to be used by another SWC.

A pure send message is a send message that appears in only one module of the software component, i.e. it is not received by another module. Its Get method is not activated.

- A send message with activated Get method can be mapped to one interrunnable variable (internal mapping) and/or one or more elements of SenderReceiver interfaces used as Pport (external mapping).
- A pure receive message can only be mapped to an element of an NVData interface or a SenderReceiver interface used as Rport (external mapping), since the message value is not given within the SWC and must therefore be given by another SWC. Internal mapping is not provided for pure receive messages.

A pure receive message is a receive message that is not used as send message within the modules of the SWC. Its Set method is not activated.

- A receive message with activated Set method can be mapped to one interrunnable variable (internal mapping) and/or one element of an NVData interface or a SenderReceiver interface used as Rport (external mapping).

If you map such a message to an element of a Pport, an error (MMdl271) is issued during code generation:

Invalid external access mapping for element "<message>" in "<component>" - mapping to elements of require port supported only

- All other messages, i.e. SendReceive messages and messages specified as send message in one module and as receive message in another module, can be mapped to an interrunnable variable (internal mapping) or to an element of a SenderReceiver interface used as Pport (external mapping).

If you map a SendReceive message with activated Get and/or Set method to an element of an Rport, an error (MMdl271) is issued during code generation.

- Pure receive messages can have one external mapping. Pure send messages and other messages can have multiple external mappings.

- Pure send messages and pure receive messages cannot have an internal mapping. Other messages can have one internal mapping.
- Imported messages must have only one internal mapping. If you apply an external mapping, too, an error (MMdl274) is issued during code generation.

Internal mapping is indicated as complete if each mappable message is mapped. External mapping is indicated as complete if each mappable message is mapped once. However, you can still map messages that allow multiple mapping.

To ease reuse of ASCET modules in SWC, it is possible to export mappings from one SWC and import them into another SWC. You can export mappings either in an XML format or as a list of comma-separated values (*.csv). In both cases, the following information is stored for each mapping:

mapping location, message name, AUTOSAR element name

In addition, the XML export file contains further details on message and AUTOSAR element.

Both valid and invalid mappings are exported; incomplete mappings are not exported. Examples for both export formats are given in [Example: Mapping Export Files](ASCexampleMappingExportFiles.md).

You can

[Access ASCET messages](asc_accessmessages.md)

[Export message/parameter mappings](ASC_ExportMessageParameterMappings.md)

[Import message/parameter mappings](ASC_ImportMessageParameterMappings.md)

See also

[Example: Mapping Export Files](ASCexampleMappingExportFiles.md)

[Introduction - Messages](IntroductionEnglishUS.chm::/INT_messages.htm)

[Message Mapping View](ASC_MessageMappingView.md)

[Ports and Interfaces](ASCportsInterfaces.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
