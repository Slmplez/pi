![](ASDlinks_21.gif)

![](ASDlinks_01.gif)

![](ASDlinks_03.gif)

![](ASDlinks_23.gif)

![](ASDlinks_32.gif)

![](ASDlinks_33.gif)

![](ASDlinks_34.gif)

![](ASDlinks_35.gif)

![](ASDlinks_08.gif)

![](ASDlinks_09.gif)

![](ASDlinks_27.gif)

![](ASDlinks_10.gif)

![](ASDlinks_11.gif)

![](ASDlinks_12.gif)

![](ASDlinks_13.gif)

![](ASDlinks_15.gif)

![](ASDlinks_17.gif)

![](ASDlinks_28.gif)

![](ASDlinks_31.gif)

![](ASDlinks_18.gif)

![](ASDlinks_26.gif)

![](ASDlinks_29.gif)

![](ASDlinks_30.gif)

# ASCET Links: Examples

This topic contains examples for ASCET links used for the following tasks:

1. [Accessing a folder](#AccessFolder)
1. [Accessing a component](#AccessComponent)
1. [Accessing a component in a specific database/workspace](#AccessSpecificDB)
1. [Accessing an element (no particular project context)](#AccessElement)
1. [Accessing an element in the context of a particular project](#AccessProjectContext)
1. [Accessing a method and its local elements](#AccessMethod)
1. [Accessing code parts in an ESDL or C code component](#AccessCode)
1. [Accessing graphical objects in a block diagram](#AccessGraphicObjects)
1. [Accessing states and junctions in a state machine](#AccessSM)
1. [Accessing cells in Boolean and conditional tables](#AccessTabCells)

##### A. Accessing a folder

1. In the Tutorial database, select the folder Control in the folder ETAS_SystemLib/Transferfunction:

1. ascet://$DATABASE$/Tutorial?ETAS_SystemLib/Transferfunction/Control
1. ascet://d:/ETASData/ASCET6.4/Database/Tutorial?ETAS_SystemLib/Transferfunction/Control

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a17'); //-->

##### B. Accessing a component

1. Select the module IdleCon in the folder Tutorial/Lesson4:

##### C. Accessing a component in a specific database/workspace

1. Select the class LowpassKEnabled in the folder ETAS_SystemLib/Transferfunction/Lowpass. Use the database stored in d:\ETASData\ASCET6.2\Database\Tutorial.

##### D. Accessing an element (no particular project context)

1. Select the message n in the Outline tab of the component editor for the module IdleCon:
1. Select the parameter n_nominal in the Browse view, Data tab, of the component editor for IdleCon. Use the data set Data_Test.
1. Select the parameter n_nominal in the Browse view, Implementation tab, of the component editor for IdleCon. Use the implementation set Impl_Int.

ascet://Tutorial/Lesson4/IdleCon/implementation=Impl_Int/element=n_nominal&location="Browse"

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a32'); //-->

##### E. Accessing an element in the context of a particular project

1. Select the message n in the Outline tab of the component editor for the module IdleCon, in the context of the parent project ControllerTest:
1. Select the parameter n_nominal in the Browse view, Implementation tab, of the component editor for IdleCon. Use the implementation set Impl_Int and the context of the parent project ControllerTest:

ascet://Tutorial/Lesson4/IdleCon/implementation=Impl_Int/element=n_nominal&location="Browse"&project=Tutorial/Lesson4/ControllerTest

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

##### F. Accessing a method and its local elements

1. Select the method doAddition in the class Addition:
1. Select the argument input2 in the method doAddition. Use the database already open in ASCET.
1. Select the return value of the method doAddition. Use the database already open in ASCET.

##### G. Accessing code parts in an ESDL or C code component

1. Set the cursor to a specific position in the code of the getElement method in the class Matrix.
1. Select a piece of code from the abs method in the class MathFcn, for the ANSI-C target, Implementation Experiment arithmetic, and Impl implementation.
1. Select a piece of code from lines 7-8 of the lineMvec method in the class Matrix.

ascet://Classes/Matrix/diagram=Main/signature=lineMvec/start=7@1/end=8@16

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a15'); //-->

##### H. Accessing graphical objects and sequence calls in a block diagram

1. Select an operator in the block diagram of IdleCon. Use the first diagram.
1. Select an operator in the diagram Public of IdleCon.
1. Open the graphical hierarchy in the first diagram of IdleCon.
1. Open the second-level hierarchy InnerHierarchy in the diagram Public of IdleCon. In addition, open the Navigation pane.
1. Select the first sequence call of the process p_idle in the first diagram of IdleCon.

ascet://Tutorial/Lesson4/IdleCon/diagram=Main/signature=p_idle/call=1

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a30'); //-->

##### I. Accessing states and junctions in a state machine

1. Select the lower state in the state machine WarmUp.
1. Select a junction in the state machine SM_beverage.

##### J. Accessing cells in Boolean and conditional tables

1. Select the cell in the third column, fourth row, of the Boolean table Class_Boolean_Table.
1. Select the top-left cell in the conditional table Class_Conditional_Table.

The column with the row numbers is counted as x=1.

ascet://$DATABASE$/Tutorial?tables/Conditional/Class_Conditional_Table/x=2/y=1

[Result](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a29'); //-->

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
