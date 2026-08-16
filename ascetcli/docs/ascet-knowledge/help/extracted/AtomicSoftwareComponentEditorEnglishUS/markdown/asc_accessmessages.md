1. Do one of the following:
1. Click on the Auto-Mapping button.

- Open the Mapping menu and select Auto-Mapping.

- Right-click in the Message Mapping view and select Auto-Mapping from the context menu.

Messages and interrunnable variables or elements of SenderReceiver/NVData interfaces with identical element name and type are mapped. Names of modules, interfaces or records are not considered. The results are shown in the Mapping field.

A message labeled as S or S/R in the Mapping field with several matching counterparts is mapped to each counterpart. Each mapping is represented by a separate row in the Mapping field.

A message labeled as R in the Mapping field is mapped to the first matching counterpart. Other counterparts are ignored.

Messages with no matching counterpart remain unmapped.

The mapped element is removed from the Variables column of the upper table. A mapped receive message is removed from the Messages column of the upper table.

You cannot use the Mapping field for multiple mappings of the same message.

1. Double-click in a cell in the Variables column.
1. Select an element.

The mapping is performed. The results are shown in the Mapping field.

The mapped element is removed from the Variables column of the upper table. A mapped receive message is removed from the Messages column of the upper table.

Or - as an alternative in the Internal Access tab -

1. In the Messages column, select an unmapped message.
1. Right-click the message and select Create Interrunnable

A new interrunnable variable with the same name, type, and implementation, as the message is created in the SWC, and mapped to the message.

The mapped message is removed from the Messages column of the upper table.

1. If necessary, click on ![](button_openList.gif) to show the upper table.
1. In the Messages column of the upper table, select a message.
1. In the Variables column, select an interrunnable variable or SenderReceiver/NVData interface element.
1. Click on ![](buttonMapCalprm.gif) to map the selected elements.

Or

1. Drag a message from the Messages column and drop it onto a suitable element in the Variables column.

The mapping is performed. The results are shown in the Mapping field.

The mapped element is removed from the Variables column of the upper table. A mapped receive message is removed from the Messages column of the upper table, other messages remain in that column.

1. In the Mapping field, Messages or Variables column, select a mapped element.
1. Do one of the following:
1. Open the context menu or the Mapping menu and select Remove.
1. Press Delete.

Or

1. In the Mapping field, double-click a cell in the Variables column and select <None>.

The mapping is removed. If it was the 1+nth mapping of a Send or SendReceive message, the entire line is removed from the Mapping field.

The interrunnable variable or SenderReceiver/NVData interface element reappears in the upper table.

If the message is a Receive message, it reappears in the upper table, too.

# Accessing ASCET Messages

If your SWC uses one or more modules that contain ASCET messages, all messages must be mapped to suitable interrunnable variables or ports of SenderReceiver or NVData interfaces. To map messages and interrunnable variables or ports, proceed as follows.

1. [Include](ascincludecomponent.md) the necessary module(s) and SenderReceiver/NVData interface(s).
1. Open the Message Mapping view and go to the desired tab.
1. If necessary, open the Mapping menu and select Update to import changes in the modules and SenderReceiver/NVData interfaces into the SWC.
1. If desired, [filter](ASC_Filter_MappingViews.md) the columns.
1. To use automatic mapping, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.
1. To map messages and interrunnable variables or elements of SenderReceiver/NVData interfaces manually in the Mapping field, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->.
1. To map messages and interrunnable variables or elements of SenderReceiver/NVData interfaces manually in the upper table (hidden by default), proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->.
1. If desired, [import](ASC_ImportMessageParameterMappings.md) an existing mapping.
1. To remove a mapping, proceed [as follows](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a5'); //-->.

Changed mappings are indicated by blue font in the Variables column of the Mapping field.

The icon column in the Mapping field shows the mapping status: ![](icon_info.gif) - unmapped / ![](icon_OK.gif) - mapping is valid / ![](icon_wrong.gif) - mapping is invalid.

See also [Example: Accessing ASCET Messages](ASC_ExampleAccessMessages.md)

See also

[Message Mapping](ASC_MessageMapping.md)

[Example: Accessing ASCET Messages](ASC_ExampleAccessMessages.md)

[Message Mapping View](ASC_MessageMappingView.md)

[Filtering the Mapping Views](ASC_Filter_MappingViews.md)

[Importing Message/Parameter Mappings](ASC_ImportMessageParameterMappings.md)

[Exporting Message/Parameter Mappings](ASC_ExportMessageParameterMappings.md)

[I](ascincludecomponent.md)ncluding a Component as a Complex Element

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
