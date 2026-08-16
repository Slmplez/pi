- Euler
- Mulstep 2
- Heun
- Adams-Moulton 2
- Runge-Kutta 4

- Dormand/Prince RK5
- Calvo 6(5)
- Dormand/Prince RK8
- Implicit RK2
- Implicit RK4
- Implicit Gear 1
- Implicit Gear 2

# Overview - Differential Equations and Integration Algorithms

Due to the complexity of the equations in continuous time models and frequent non-linearities, it is generally not possible to solve them by analytic methods. It is therefore necessary to solve the differential equation system using a numeric integration algorithm.

If only CT blocks are simulated in a CT structure, ASCET uses a global integration algorithm. The combination with discrete controller models is possible at the project level only (combined modeling in a hybrid project). Projects also support modeling with several CT structures using different integration methods.

To ensure high flexibility and short iteration cycles for modeling and simulations, the configuration of the integration method, i.e., the actual integration method and its integration step size, can be selected and modified interactively during the experiment.

There is no ideal integration method that fits all types of models. The speed and accuracy of the individual algorithms varies for different model characteristics such as non-linearities, discontinuities, and dynamic behavior. A general statement regarding the speed of each method cannot be given, as the step size is adapted to suit the model and integration method best. However, some guidelines for selecting a suitable integration method are given below. Detailed information can be found in the literature, e.g.,

Addison, C. A.; Enright, W. H.; et al., A Decision Tree for the Numerical Solution of Initial Value Ordinary Differential Equations. ACM Transitions on Mathematical Software 17, 1, March 1991, Chapter "Continuous Time Integration Algorithms".

ASCET provides several [fixed-step integration methods](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

To solve more complex or stiff differential equations that need more precise calculation, ASCET provides several [variable-step iterative integration methods](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->.

During calculation, these integration methods adapt the step width used interactively in order to achieve a certain given precision. Therefore, they cannot be used for real-time calculations.

The integration method is always specified for the entire model (global integration). When experimenting in a project context, a separate integration method can be specified for each block separately (multirate). It is possible to change the integration method during the experiment.

Due to technical reasons, the implicit integration methods can only be used with newer Borland and Microsoft compilers, among them MinGW GNU 4.7.2 (shipped with ASCET). They cannot be used with the Borland-C V4.5 compiler shipped with previous ASCET versions. The integration methods are taken from the GNU Scientific Library. The integration method Gear 4 has been unavailable since ASCET V5.2.

See also

[Overview – Integration Methods](CTB_OverviewIntegrationMethods.md)

[Euler](ctb_euler.md)

[Mulstep](ctb_mulstep.md)

[Heun](ctb_heun.md)

[Adams-Moulton](ctb_adams-moulton.md)

[Runge-Kutta 4](ctb_runge-kutta_4.md)

[Integration Methods With Variable Step Width](ctb_integration_methods_with_variable_step_width.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
