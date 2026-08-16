The signature editor for methods in classes and modules (block diagrams or ESDL) contains the following elements.

- [Argument](BDE_Arguments_Menu.md) menu
- [Return](BDE_Return_Menu.md) menu
- [Local Variable](BDE_Local_Variable_Menu.md) menu
- [Arguments](BDE_Arguments_Tab.md) tab
- [Return](bde_return_tab.md) tab
- [Locals](bde_locals_tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

ESDL Editor online help (opens in a second help viewer window)

The signature editor for processes contains the following elements.

- [Local Variable](BDE_Local_Variable_Menu.md) menu
- [Locals](bde_locals_tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

ESDL Editor online help (opens in a second help viewer window)

The signature editor for triggers in state machines contains the following elements.

- [Input](BDE_Arguments_Menu.md) menu
- [Inputs](BDE_Arguments_Tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

State Machine Editor online help (opens in a second help viewer window)

The signature editor for actions and conditions in state machines contains the following elements.

- [Argument](BDE_Arguments_Menu.md) menu
- [Return](BDE_Return_Menu.md) menu
- [Local Variable](BDE_Local_Variable_Menu.md) menu
- [Arguments](BDE_Arguments_Tab.md) tab
- [Return](bde_return_tab.md) tab
- [Locals](bde_locals_tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

State Machine Editor online help (opens in a second help viewer window)

The signature editor for methods in AUTOSAR software components contains the following elements.

- [Argument](BDE_Arguments_Menu.md) menu
- [Return](BDE_Return_Menu.md) menu
- [Local Variable](BDE_Local_Variable_Menu.md) menu
- [Arguments](BDE_Arguments_Tab.md) tab
- [Return](bde_return_tab.md) tab
- [Locals](bde_locals_tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

Software Component Editor online help (opens in a second help viewer window)

The signature editor for methods (operations) in ClientServer interfaces contains the following elements.

- [Argument](BDE_Arguments_Menu.md) menu
- [Return](BDE_Return_Menu.md) menu
- [Arguments](BDE_Arguments_Tab.md) tab
- [Return](bde_return_tab.md) tab
- [Settings Tab](BDE_SettingsTab.md)

See also

AUTOSAR Interface Editor online help (opens in a second help viewer window)

# Signature Editor

The signature editor can be opened in various contexts. Depending on the context, the functionality the signature editor provides can differ.

##### [Signature editor for methods in classes and modules](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

##### [Signature editor for processes](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

##### [Signature editor for triggers in state machines](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a5'); //-->

##### [Signature editor for actions and conditions in state machines](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

##### [Signature editor for methods in AUTOSAR software components](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

##### [Signature editor for methods (operations) in ClientServer interfaces](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->

##### ![](images/statisch.gif) All

![](BUTTON.GIF) OK

Closes the signature editor and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the signature editor without accepting the settings.

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
