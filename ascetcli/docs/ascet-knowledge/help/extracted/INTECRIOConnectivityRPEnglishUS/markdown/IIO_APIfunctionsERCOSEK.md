Application Programming Interface

The concept of application modes allows the efficient management of different processing states in the application software. An application mode is defined by a set of tasks which are active in this mode and one or more optional timetables. Application modes for an engine control unit can be, for example: normal operation (control of the technical process), auto-diagnostics, flash EPROM programming. Only one application mode can be active at a time.

An application mode consists of two phases: the first phase is the initialization phase. This is where the initialization routines of the application are processed. Interrupts are disabled. After initialization, the interrupts are enabled and the execution phase begins. Here the activated tasks of the application are processed according to their priorities (scheduled).

There are two types of tasks in ERCOSEK: firstly software tasks (SW tasks) which are activated by ActivateTask(); the processing is coordinated by the ERCOSEK scheduler, and secondly hardware tasks (HW tasks) which are activated by an interrupt. In this case scheduling is carried out by the interrupt control logic of the processor, i.e. by the hardware.

A discrete system time is the time base of ERCOSEK. For those targets which do not offer a hardware-based system time, the system time is set to 0 with the start of the operating system. The system time, which is normally counted with a width of two machine words, is used as the reference time for alarm services and the ERCOSEK timetable. The time until an overflow of the system time occurs depends on CPU and the frequency of the hardware timer used. The system time is not interrupted or reset by an application mode change.

The system time is counted in ticks of the underlying timer register. The macro SYSTEM_TICK_DURATION returns the duration of such a tick in nanoseconds.

ERCOSEK provides a routine to save and restore context relevant data in the frame of an interrupt service routine. Furthermore, the certain valid interrupt descriptor can be accessed by an ERCOSEK API-function.

ERCOSEK provides a service routine for querying the time elapsed between the last start of the currently running task and the start of the currently running task (see figure below). The time returned always concerns the task from which the service was called.

![](dt_scheme.gif)

The dT returned by GetDeltaT() is very useful for mathematical calculations, e.g., an integration:

![](integration.gif)

# API Functions - ERCOSEK

Several [API](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> functions define the interface between the application and ERCOSEK.

##### [Application Modes](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

- [DeclareAppMode](IIO_DeclareAppMode.md)
- [SetNextAppMode](IIO_SetNextAppMode.md)

##### [Tasks](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

- [DeclareTask](IIO_DeclareTask.md)
- [ActivateTask](IIO_ActivateTask.md)

##### [System Time](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->

- [GetSystemTime](IIO_GetSystemTime.md)
- [GetSystemTimeLow](IIO_GetSystemTimeLow.md)
- [GetSystemTimeHigh](IIO_GetSystemTimeHigh.md)

##### [Interrupt Handling](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a5'); //-->

- [EnableAllInterrupts](IIO_EnableAllInterrupts.md)
- [DisableAllInterrupts](IIO_DisableAllInterrupts.md)

##### [dT Query](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

- [GetDeltaT](IIO_GetDeltaT.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
