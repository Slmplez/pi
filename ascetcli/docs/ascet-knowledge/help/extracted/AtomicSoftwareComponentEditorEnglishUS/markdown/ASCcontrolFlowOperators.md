The control flow output is connected to one or more sequence calls which are triggered whenever the control flow branch is activated. Whenever the input expression evaluates to True, the connected sequence calls are executed.

![](bde_if.gif)

The example above is equivalent to

if (l) {

c = b

};

As for the if…else statement in ESDL, the generated code is optimized when the expression for If…Then is always true. [If…Else (ESDL)](ESDLEditorEnglishUS.chm::/ifelse.htm) describes how the optimization works.

![](bde_ifelse.gif)

The example above is equivalent to

if (l) {

d = b}

else {

c = b

};

As for the if…else statement in ESDL, the generated code is optimized when the expression for If…Then…Else is always true. [If…Else (ESDL)](ESDLEditorEnglishUS.chm::/ifelse.htm) describes how the optimization works.

Similarly to the If…Then statement, the control flow is activated when the value of the logical expression is True. The operation is executed as long as the value of the logical input remains True. Therefore, the value of the logical expression should be manipulated in the while loop.

In order to avoid infinite loops, the maximal number of loop iterations can be limited to a fixed number in the project properties, Experiment Code node, of the associated project (or default project).

![](3b8003.bmp)

The example above is equivalent to

while (i<10) {

c = b * c;

i = 1 + i;

};

For each alternative the value for the branch can be defined by the user. The last branch at the bottom is the default branch that is executed if the input value does not equal any of the values at the branches.

![](3b8004.bmp)

The example above is equivalent to

switch (a) {

case 0: {

d = c;

break; }

case 5: {

d = b;

break; }

default: {

d = 0;

break; }

}

# Control Flow Operators

The following Control Flow Operators are available:

| Column 1 | Column 2 |
| --- | --- |
|  | The If…Then statement evaluates a logical expression and activates a control flow branch if the result is True. Details |
|  | If…Then…Else is similar to If…Then , but has two control flow branches. Depending on the value of the logical expression, the left or right branch is executed, the right branch is executed if the value is True, the left one if it is False. Details |
|  | The only loop construct available in block diagrams is the While loop. Care has to be taken to avoid infinite loops or loops unsuitable for real-time applications. Details |
|  | The Switch construct is similar to the Case operator . A Switch evaluates a signed discrete or unsigned discrete value and, depending on that value, activates different control flow branches. These branches are separated from each other, so that a “fall through” like in the switch construct in C is not possible. Details |
|  | The break operator in the software component editor behaves similar to a C language return statement. In a method, the break operator causes an immediate return from the method. The user is responsible for the correct setting of any return values before the break operator is executed. In a process, the break operator causes a deferred exit. Deferred exit means that all send messages are sent before the exit occurs. The break operator in the software component editor behaves differently from the break statement in ESDL. |

See also

[Using the If Statements](ascuseif.md)

[Using the While Loop](ascusewhileloop.md)

[Using the Switch Operator](ascuseswitch.md)

[Arithmetic Operators](ASCarithmeticOperators.md)

[Logical Operators](ASClogicalOperators.md)

[Comparison Operators](ASCcomparisonOperators.md)

[Input Operators](ASCinputOperators.md)

[Negation Operator](ascnegationoperator.md)

[Conditional Operators](ASCconditionaloperators.md)

[Miscellaneous Basic Blocks](ascmiscbasicblocks.md)

[Project Editor - Experiment Code Node](ProjectEditorEnglishUS.chm::/Exp_Code_Options_Window.htm)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
