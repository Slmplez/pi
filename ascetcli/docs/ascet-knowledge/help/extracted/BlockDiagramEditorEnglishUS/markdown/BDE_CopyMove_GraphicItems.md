All graphical elements are pasted to the currently loaded diagram.

Sequence calls of method-/process-/runnable-local elements are adjusted to the target method/process/runnable the elements belong to. Possible adjustments are

- different method name
- different (or reset) sequence number if the old numbers are in use.

Sequence calls of other elements are reset.

All graphical elements are pasted to the currently loaded diagram.

Sequence calls of method-/process-/runnable-local elements are adjusted to the target method/process/runnable the elements belong to. Possible adjustments are

- different method name
- different (or reset) sequence number if the old numbers are in use.

Sequence calls of other elements are reset.

If you selected the respective solution, the conflicting element names are changed.

If necessary, the visual properties (e.g., read/write access pins) are changed to reflect property changes.

All graphical elements are pasted to the currently loaded diagram.

Sequence calls of method-/process-/runnable-local elements are adjusted to the target method/process/runnable the elements belong to. Possible adjustments are

- different method name
- different (or reset) sequence number if the old numbers are in use.

Sequence calls of other elements are reset.

If you selected the respective solution, the following adjustments can be performed:

- Conflicting element names are changed.
- Visual properties (e.g., read/write access pins) are changed to reflect property changes.
- The graphical item is changed to reflect the type change (e.g., array vs. scalar element).
- Connection lines are updated to reflect type changes and/or invalid connections (e.g. connections between cont and log).

# Copying or Moving Graphical Items

Graphical items of a block diagram can be added to the same diagram, another diagram of the same component, or a diagram of another component, via cut, copy and paste. ASCET uses its own internal clipboard for graphical information, so these operations have no effect on the Windows clipboard.

You can cut/copy/paste all kinds of graphical items: elements, operators, included components, method-/process-local elements, etc. However, keep in mind the following restrictions:

- Graphical items can be pasted only to the currently loaded diagram.
- Method-/process-local elements can be pasted only to a single method or process at a time.

Elements copied/cut from different source methods/processes are pasted to the same target method or process.

- Pasting an element or included component to the same diagram creates a new graphical occurrence of the same object, not a new object.
- Pasting a method-/process-local element to the same diagram and the same method/process/runnable creates a new graphical occurrence of the same element, not a new element.
- You cannot paste elements to a method/process/runnable that does not support additional elements (e.g., a CT block method, or automatically generated runnables in an SWC).
- Only those elements are pasted that are allowed in the target component and the target method/process/runnable.

You cannot, e.g., paste a return value into a process, a state into a block diagram class, etc.

The following happens when you paste graphical items, depending on where you paste:

##### A. same component, same diagram

All graphical elements are pasted. Sequence calls are reset.

##### B. same component, different diagram

The behavior depends on the conflicts found during paste, and to the solutions you select.

- [no conflicts](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

- [Name conflicts](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

A name conflict occurs if a method-/process-/runnable-local element (argument or local variable) in the target diagram and method has the same name and type as a pasted method-/process-/runnable-local element.

- [Type conflicts](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

A type conflict occurs if a method-/process-/runnable-local element in the target diagram and method has the same name and a different type as a pasted method-/process-/runnable-local element.

- C. different component

The behavior is basically the same as for "same component, different diagram".

In addition, it is checked if pasting is allowed at all. If it is not, an error message opens and pasting is canceled.

If pasting is allowed, it is checked if the pasted elements are allowed in the target component and method/process/runnable. If at least one pasted element is not allowed (e.g., a return value in a process), another error message opens that lists the elements that cannot be pasted. You can continue pasting the allowed elements, or cancel the procedure.

A schematic view of the procedure for B and C is given in [Flow Chart: Copying or Moving Graphical Items](BDE_Flowchart_CopyMoveItems.md).

See also

[Flow Chart: Copying or Moving Graphical Items](BDE_Flowchart_CopyMoveItems.md)

[Copying/Moving Diagram Items in the Same Diagram](BDE_Cutcopypaste.md)

[Copying/Moving Diagram Items Between Diagrams](BDE_CopyMove_Items_betweenDiagram.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
