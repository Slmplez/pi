- Changing the instance name of any NV element on the project, module, class, or sub-class level.
- Changing the implementation of any NV element on the project, module, class, or sub-class level, namely:

- Code generation option Physical Experiment – switching the implementation data type between cont and sint/uint
- Code generation option Implementation Experiment – changes of the implementation interval

- Changing the formula parameters of any NV element.

The NV identifier does not change if the name or the comment of a formula is changed.

- For an NV enumeration:

- Changing the sequence of the enumerators
- Changing the names (values) of the enumerators
- Removing/adding enumerators
- Selecting a different enumeration, even if it contains the same enumerators

- Changing the maximal size of multidimensional NV elements (array, matrix, characteristic line/map).
- Changing the settings for the implementation limitation in the implementation experiment (code generation option Implementation Experiment).
- Deleting/adding NV elements on the project, module, class, or sub-class level.
- Deleting/adding states in a state machine.

- Renaming the project.
- Renaming the modules or classes within the project.
- Renaming the instances of any normal (volatile) element on the project, module, class, or sub-class level.
- Changing the formula name or comment of any NV element.

When the formula parameters are changed, the NV identifier changes, too.

- Renaming an enumeration.
- Changing the data of NV elements and normal elements.
- Changing the actual size of multidimensional elements (array, matrix, characteristic line/map).
- Changing the memory area of NV elements and normal elements.

# NVRAM: Hardware Support

Non-volatile RAM (NVRAM) is available in the address space of the ES1135 main processor (IBM750GX), on the ES910 and on RTPRO-PC. In this memory range, data can be stored which are to be available after a power failure or longer than one power-on cycle.

Due to performance reasons (accesses to the NVRAM are significantly slower than accesses to the normal, volatile RAM and, in addition, cannot be cached), NV variables are not directly allocated to the NVRAM. Instead, they are allocated like normal, volatile variables to normal RAM, and periodically saved to the NVRAM (auto-update mode). The period is by default set to 10 seconds; it can be configured with the API method

uint32 nvramSetUpdateInterval(uint32 interval_sec)

(see also [API Functions - NVRAM](IIO_APIfunctionsNVRAM.md)) in the range from 1 second to 30 seconds. Saving to the NVRAM is done within the idle task, it does not affect the real-time behavior of the model.

For reasons of [data consistency](IIO_NVRAM_DataConsistency.md), the NVRAM is organized as alternation buffer which halves the available capacity. Furthermore, there is some overhead involved which reduces the NVRAM capacity available to the ASCET model to a little less than half of the available capacity. The following table lists the available NVRAM capacities for the respective targets.

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
| available NVRAM | ES1135 | ES910 | RTPRO-PC |
| on target | 64 kByte | 32 kByte | depends on USB stick used as persistent memory |
| in ASCET | < 32 kByte | < 16 kByte | < half the available capacity |

The ES1135 or ES910 or RTPRO-PC firmware ensures that the capacity limit is respected. If the cumulative size of NV variables exceeds the NVRAM capacity, an "NVRAM overflow" error message appears in the ASCET monitor window at the start of the experiment. In this case, the NVRAM is not used, i.e. no values are written to it. In order to be able to use the NVRAM, the user needs to reduce number and/or size of NV variables in the model.

##### NV identifier

The NVRAM data contain neither address information nor the names of the variables. Therefore, they correspond to the model only if the structure of the NV variables in the model did not change after the last update. To check this, a special NV identifier is created during code generation.

This NV identifier changes upon the [following actions](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

1. The NV identifier does not change upon the [following actions](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.

See also

[NVRAM Safety Information](IIO_NVRAMSafetyInformation.md)

[API Functions - NVRAM](IIO_APIfunctionsNVRAM.md)

[NV Variable Initialization and Update](IIO_NVVariable_InitializationUpdate.md)

[NVRAM: Data Consistency](IIO_NVRAM_DataConsistency.md)

[NVRAM Cockpit](IIO_NVRAMcockpit.md)

[NVRAM: Tips](IIO_NVRAMtips.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Show all hidden text</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Hide all hideable text'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
