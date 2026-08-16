##### Type

Determines the task type. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Alarm | Periodic task, triggered once at the beginning of each interval defined in the Period field. |
| Init | Triggered only once at the startup of the assigned application mode. |
| Software | Triggered by operating system commands. |
| Interrupt | Triggered by hardware events. |

##### Priority

Available for alarm tasks, software tasks and interrupt tasks.

Task priority; determines the activation sequence. A higher number means higher priority.

##### Scheduling

Available for alarm tasks and software tasks.

Scheduling mode. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| FULL | Full preemptive scheduling. A running task with mode FULL is interrupted as soon as a task with higher priority is activated. The task context is saved so that the preempted task can be continued at the location where it was interrupted. |
| NON | Non preemptive scheduling. A running task with mode NON can be interrupted only at an explicit point of rescheduling, even if a task with higher priority is activated. The lower priority task delays the start of the interrupting task up to the next point of rescheduling. Only ISRs can interrupt NON tasks at any point. |
| Cooperative | Cooperative scheduling. The lowest priority tasks share the same internal resource; they can be freely interrupted by higher priority tasks of mode FULL or NON . A higher-priority task of type COOPERATIVE can interrupt the running cooperative task only after the current process is finished. The use of cooperative tasks is not recommended for ASCET-SE projects. |

##### ISR Source

Available for interrupt tasks when you are working with ASCET-SE.

Determines the event used as trigger for the interrupt task. Available values depend on the selected target.

##### Period

Available for alarm tasks.

The activation period in seconds or system ticks, depending on your [operating system settings](PE_OS_Settings_RTAOSEK_OSEK.md).

##### Resulting Period

Available for alarm tasks.

The period is converted to the next highest integer number of system ticks. This number is displayed in the Resulting Period field, in seconds or system ticks (depending on your [operating system settings](PE_OS_Settings_RTAOSEK_OSEK.md)), and used as period.

##### Delay

Available for alarm tasks.

Time in seconds or system ticks (depending on your [operating system settings](PE_OS_Settings_RTAOSEK_OSEK.md)) between activation and start of the task.

##### Resulting Delay

Available for alarm tasks.

The delay is converted to the next highest integer number of system ticks. This number is displayed in the Resulting Delay field, in seconds or system ticks (depending on your [operating system settings](PE_OS_Settings_RTAOSEK_OSEK.md)), and used as delay time.

##### Max. number of Activations

Available for alarm tasks and software tasks when you are working with ASCET-RP.

Determines how many times a task can be activated in parallel.

##### Autostart

Alarm tasks: When activated, the timer for the selected task starts at the initialization of the associated application mode.

or

Software tasks: The task is executed once at the initialization of the associated application mode.

##### pre/post hooks

Available for alarm tasks, software tasks and interrupt tasks when you are working with ASCET-RP.

Determines the way hook routines for debugging purposes are generated. Only useful when Enable Monitoring is activated.

| Column 1 | Column 2 |
| --- | --- |
| none | no debug functions |
| monitoring | complete debug functions |

##### Type

Determines the task type. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Alarm | Periodic task, triggered once at the beginning of each interval defined in the Period field. |
| Init | Triggered only once at the startup of the assigned application mode. |
| Software | Triggered by operating system commands. |
| Interrupt | Triggered by hardware events. Not available for PC target. |

##### Priority

Available for alarm tasks, software tasks and interrupt tasks.

Task priority; determines the activation sequence. A higher number means higher priority.

##### Scheduling

Available for alarm tasks and software tasks.

Scheduling mode. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| cooperative | Periodic task, triggered once at the beginning of each interval defined in the Period field. |
| preemptive | Triggered only once at the startup of the assigned application mode. |

##### ISR Source

Available for interrupt tasks.

Determines the event used as trigger for the interrupt task. Available values depend on the selected target.

##### Period

Available for alarm tasks.

The activation period in seconds.

##### Delay

Available for alarm tasks.

Time in seconds between activation and start of the task.

##### Max. number of Activations

Available for alarm tasks and software tasks.

Determines how many times a task can be activated in parallel.

##### Autostart

Alarm tasks: When activated, the timer for the selected task starts at the initialization of the associated application mode

or

Software tasks: The task is executed once at the initialization of the associated application mode.

##### Deadline

Available for alarm tasks and software tasks.

When activated, two consecutive task activations do not exceed the time in seconds specified in the input field.

##### Min. period

Available for interrupt tasks.

When activated, two consecutive task activations do not fall below the time in seconds specified in the input field.

##### pre/post hooks

Available for alarm tasks, software tasks and interrupt tasks.

Determines the way hook routines for debugging purposes are generated. Only useful when Enable Monitoring is activated.

| Column 1 | Column 2 |
| --- | --- |
| none | no debug functions |
| monitoring | complete debug functions |

# Task Options

This topic is irrelevant for the EHOOKS target or the ANSI-C target with [RTE-AUTOSAR *](Build_Options.md) operating system.

The options of a selected task are shown on the right-hand side of the [OS tab](PE_OS_Tab.md). Depending on the OS selected in the [Build node](Build_Options.md) of the project properties, different task options are available.

[RTA-OSEK + Generic-OSEK](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //--> (ASCET-SE targets and ASCET-RP targets ES910 and RTPRO-PC)

[ERCOSEK + Generic OS](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //--> (PC target and ASCET-RP targets ES113x)

See also

[OS Tab](PE_OS_Tab.md)

[Operating System Settings (RTA-OSEK + Generic-OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)

[Operating System Settings (ERCOSEK + Generic OS)](setoperating.md)

[Build Node](Build_Options.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
