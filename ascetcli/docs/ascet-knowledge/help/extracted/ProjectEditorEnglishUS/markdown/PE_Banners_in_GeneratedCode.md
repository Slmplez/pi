| Column 1 | Column 2 |
| --- | --- |
| Macro | Remarks |
| $(COMPONENT.KIND) | one of the following: Project , Module , Class , CtClass , Statemachine , BooleanTable , ConditionalTable , Software Component |
| $(COMPONENT.NAME) | model name of the component |
| $(COMPONENT.SPECIFICATION) | one of the following: Block_Diagram , ESDL , C Code , Operating System , Boolean Table , Record , State Machine ; <not applicable> for projects. |
| $(COMPONENT.VERSION) | version string if the component is subject to version management ( <empty string> otherwise) |
| $(COMPONENT.IMPLEMENTATION) | currently used implementation |
| $(COMPONENT.DATASET) | currently used dataset |
| $(FILE.NAME) | name of the generated file |
| $(FILE.EXTENSION) | extension of the generated file |
| $(FILE.DESCRIPTION) | description of the generated file |
| $(FILE.DATE) | creation date of the generated file |
| $(FILE.TIME) | creation time of the generated file |
| $(ASCET.USER) | current user |
| $(ASCET.VERSION) | ASCET version used to create the generated file |
| $(ASCET.MD.VERSION) | ASCET-MD version used to create the generated file |
| $(ASCET.RP.VERSION) | ASCET-RP version used to create the generated file |
| $(ASCET.SE.VERSION) | ASCET-version SE used to create the generated file |

# Banners in the Generated Code

ASCET provides the possibility to insert user-defined banners in the *.c and *.h files generated via the File menu, Export submenu, Generated Code submenu options or via the View Generated Code, Experiment or - in the project editor - Build All or Rebuild All options in the Build menu.

For that purpose, two banner template files (named, e.g., banner.template.c for generated *.c files and banner.template.h for *.h files) can be assigned to a project or default project, in the [Build](Build_Options.md) node of the Project Properties window.

The default location for banner template files is the target root directory ETAS\Ascet<n>\target (<n> being the ASCET version number). If you use the default location, but no banner.template.c or banner.template.h files are found when one of the menu options mentioned above is called, [default template files](PE_DefaultBannerTemplateFile.md) will be generated for both. You can adapt these files to create your own banners.

If you enter a non-default location, or non-default file names, in the Build node, and these files are not found during code generation, no default files are created.

A banner template file can contain fixed text and macros. The macros will be expanded when the banner is inserted into a code or header file. In addition to the macros in the default template file, the macros listed in the [following table](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> can be used.

Changes in a banner template file apply to all projects that use this particular banner template file.

In previous ASCET versions, the inserted banners could not be modified by the user. To provide compatibility with previous versions, this behavior can be re-activated for individual targets in ASCET-SE (see [Activating Old Behavior for Banners](PE_ActivateOldBehaviorBanners.md)). The cs_overload.pm file in the ETAS\Ascet<n>\target\trg_<targetname>\cp_rules\ custom directory contains the switch to the old behavior.

See also

[Default Banner Template File](PE_DefaultBannerTemplateFile.md)

[Example: Banner With All Macros](PE_ExampleBannerWithAllMacros.md)

[Activating Old Behavior for Banners](PE_ActivateOldBehaviorBanners.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
