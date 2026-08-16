link element &location=<location>, where

<location> = Browse or Outline or Navigation or Specification or Specific

context information can be one or more of the following:

- &implementation=<implementation name>
- &data=<data set name>
- &target=<target name>
- &generator=<code generator name>
- &project=<parent project DB/WS path and name>

If a [project](ProjectEditorEnglishUS.chm::/pe_project.htm) is specified that does not exist, the link shall execute with the default project. A warning is reported in the monitor window.

# ASCET Links

ASCET provides a possibility to open and select components or model elements via calls from external tools or scripts. Two examples for external tools are

- requirement management tools
- model documentation

You can address all ASCET components and many component parts, see [ASCET Links: Addressable Objects](INT_ASCETLinks_AddressableObjects.md) for an overview.

The calls use an URL-like syntax; they are referred to as ASCET links. ASCET links can be executed from inside ASCET (paste the link into the navigation bar) or from any external application that is able to invoke registered protocol handlers (e.g., Internet Explorer, Mozilla Firefox, and most E-mail clients).

If ASCET is not yet running when an ASCET link is executed, the most recently used ASCET version is started. Only one ASCET version should run when an ASCET link is executed.

Links that do not match the syntax described here produce an error message. This includes ASCET links generated with ASCET V6.2.*.

An ASCET link consists of up to three parts. It is built as follows:

ascet://[<destination>?]<component path>[/<target object>]

- <destination> is the database/workspace path of the component you want to address. It can be given in two ways:

- full path (e.g., D:\ETASData\ASCET6.4\Databases\MyDatabase; see also [example C](INT_ASCETLinks_Examples.md#AccessSpecificDB))
- path token

Either $DATABASE$ or $WORKSPACE$. Both tokens will be replaced by ASCET with the currently selected database or workspace root path (e.g., D:\ETASData\ASCET6.4\Database or D:\ETASData\ASCET6.4\Workspaces).

The actual resolved value depends on the settings in the [Paths](ComponentManagerEnglishUS.chm::/CM_PathsNode.htm) node of the ASCET options window.

The <destination> is optional. Without a destination, the database/workspace currently open in ASCET can be addressed (examples [E.2](INT_ASCETLinks_Examples.md#AccessMedthodArg) and [E.3](INT_ASCETLinks_Examples.md#AccessMethodReturn)).

- <component path> defines the component where all objects specified in <target options> will be found. <component path> is the component path in the database/workspace (e.g., ASCET_Tutorial_Solutions\Lesson5\SignalConv).

The <component path> path is mandatory.

- <target object> defines the model element or graphical object to be highlighted.

The <target object> is optional. Without a target object, only folders ([examples A](INT_ASCETLinks_Examples.md#AccessFolder)) and components ([example B](INT_ASCETLinks_Examples.md#AccessComponent)) can be addressed.

The target object may contain a [location](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> (see, e.g., example [D.2](INT_ASCETLinks_Examples.md#AccessinBrowseView) or [H.4](INT_ASCETLinks_Examples.md#AccessinNavigation)) or [context information](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //--> (see, e.g., examples [E](INT_ASCETLinks_Examples.md#AccessProjectContext) or [G.2](INT_ASCETLinks_Examples.md#AccessContext_t)).

ASCET links can be typed manually or created via the Create ASCET Links context menu option in the following places:

- 1 Database / 1 Workspace list and 3 Contents field in the component manager
- Outline tab in component and project editors
- Navigation tab in component and project editors (only for graphical hierarchies and statement blocks)
- Specification view and Browse view (except Layout tab) of component editors
- Graphics, Formulas and Impl. Types tabs in the project editor

When you open a component editor from the editor of a specific parent project, the project is included in the ASCET links created via the context menus.

The options in the [Integration](componentmanagerenglishus.chm::/cm_options_for_integration.htm) node of the ASCET options window determine the way ASCET links are created by the context menu:

- Include Data Storage determines whether the links are created with (activated) or without (deactivated) <destination>.
- Destination as token option in the [Integration](componentmanagerenglishus.chm::/cm_options_for_integration.htm) node of the ASCET options window determines whether a full path or a path token is generated for <destination>.

See also

[ASCET Links: Addressable Objects](INT_ASCETLinks_AddressableObjects.md)

[ASCET Links: Examples](INT_ASCETLinks_Examples.md)

[Component Manager - Path Options (Environment)](ComponentManagerEnglishUS.chm::/CM_PathsNode.htm)

[Component Manager - Integration Options](componentmanagerenglishus.chm::/cm_options_for_integration.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
