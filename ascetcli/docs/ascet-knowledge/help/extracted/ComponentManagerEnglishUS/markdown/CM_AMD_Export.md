| Column 1 | Column 2 |
| --- | --- |
| Information type | Content |
| main | Names and properties of the elements in the project ( Element Editor ) |
| data | Data of the elements in the project ( Data Editor ) |
| experiments | Experiment environments defined in the project (see Experimentation ) |
| implementation | Implementations of the elements in the project ( Implementation Editor ) |
| specification | Specification details (e.g., structure of the diagram in the Graphics tab) |
| meta | Meta data of the project (e.g., time stamps for formulas or implementation types) |
| project | Project-specific data such as operating system configuration ( Scheduling in the OS Editor ), project settings ( Project Settings ) |
| project.formulas | Formulas defined in the project ( Adding Formulas ) |
| project.implementationTypes | Implementation types defined in the project ( Implementation Types ) |

| Column 1 | Column 2 |
| --- | --- |
| Information type | Content |
| main | Names and properties of the elements in the component ( Element Editor ) |
| data | Data of the elements in the component ( Data Editor ) |
| experiments | Experiment environments defined in the component (see Experimentation ) |
| implementation | Implementations of the elements in the component ( Implementation Editor ) |
| specification | Specification details (e.g., interface information, block diagram structure, code of an ESDL or C code component) |
| meta | Meta data of the component (e.g., time stamp of the last change of a global element) |
| main.dp | Names and properties of the elements in the default project of the component |
| data.dp | Data of the elements in the default project |
| experiments.dp | Experiment environments defined in the default project |
| implementation.dp | Implementations of the elements in the default project |
| specification.dp | Specification details of the default project |
| meta.dp | Meta data of the default project |
| project.dp | project-specific data for the default project, such as operating system configuration ( Scheduling in the OS Editor ), project settings ( Project Settings ) |
| project.formulas.dp | Formulas defined in the default project ( Adding Formulas ) |
| project.implementationTypes.dp | Implementation types defined in the default project ( Implementation Types ) |

# AMD/AXL Export

ASCET provides the XML-based export format *.amd. The required XML schemas for the current version are delivered with ASCET; they are stored in the Schemas subdirectory of your ASCET installation.

When you select this export format, several *.amd files are created for each exported component. These files store the various information. The names of these files are created as follows:

<component name>.<information type>.amd

The tables list the information types and file content of AMD export files:

- [for projects](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->
- [for components](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

Each AMD file contains a signature which is used, during import, to check whether the file was changed between export and import.

If duplicate paths, i.e. database/workspace items with identical name and path, but different OID, are detected during AMD export, an error window opens that lists the affected items and asks you to rename them. The export is aborted.

If desired, the AMD files can be collected and compressed into a Zip file during export. This Zip file has the extension *.axl.

To grant IP protection during exchange, ASCET provides the possibility to encrypt the AMD export files: You can enter an encryption key in the respective field of the [Export](CM_Export_Node.md) node of the ASCET Options window.

Any character string can be used as encryption key; for safety reasons, a key of at least 4 characters is recommended.

To allow import with previous ASCET versions, you can select the target ASCET version for the AMD export in the respective field of the [Export](CM_Export_Node.md) node of the ASCET Options window.

Any component information not available in the selected target ASCET version is removed during export. If an entire component cannot be exported (e.g. because that kind of component was not available in the selected ASCET version), an error appears.

See also

[Exporting Folders and Database/Workspace Items](ExportingFolders.md)

[Export Options](CM_Export_Node.md)

[Element Editor - Overview](ElementEditorEnglishUS.chm::/EEd_Overview.htm)

[Data Editor - Overview](DataEditorEnglishUS.chm::/DEd_Overview.htm)

[Experimentation - Overview](ExperimentationEnglishUS.chm::/EE_Overview.htm)

[Implementation Editor - Overview](ImplementationEditorEnglishUS.chm::/IEd_Overview.htm)

[Scheduling in the OS Editor](ProjectEditorEnglishUS.chm::/schedulingos .htm)

[Project Settings](ProjectEditorEnglishUS.chm::/projectsettings.htm)

[Adding Formulas](ProjectEditorEnglishUS.chm::/PE_add_formula.htm)

[Implementation Types](ProjectEditorEnglishUS.chm::/PE_ImplementationTypes.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
