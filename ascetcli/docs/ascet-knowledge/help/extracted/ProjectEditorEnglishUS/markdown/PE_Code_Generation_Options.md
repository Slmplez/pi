/* return with expr from doAddition:

min=-65536, max=65534, hex=1phys+0,

limit=(maxBitLength: true, assign: true)*/

return ((sint32)input1 + input2);

/* doAddition: line #1 */

self->cont->val = input1 + input2;

Motor Industry Software Reliability Association

If the option is deactivated, the following code is generated:

log_x = log_a && log_b;

If the option is activated, the following code is generated for the same sample operation:

log_x = (log_a) && (log_b);

If the option is deactivated, the following code is generated:

x = (a > b) ? a - b : a + b;

x = a + b * c;

if (a + b == c) {.. }

If the option is activated, the following code is generated for the same sample operations:

x = (a > b) ? (a - b) : (a + b);

x = a + (b * c);

if ((a + b) == c) {.. }

# Code Generation Node

This node contains the following options:

##### Protected against Division by Zero

This option refers to generated C code, not to model divisions.

If this option is activated, ASCET generates a check to prevent division by zero at runtime. If the denominator is non-zero, the division is evaluated normally. If the denominator is zero, then, by default, the nominator is returned as result (i.e. a/b == a if b == 0).

The default result for a zero denominator can be modified via the [Result on Division by Zero](fixedpoint.md#ResultDivZero) option.

This does not apply to integer divisions with arithmetic services, because arithmetic services routines are required to protect against division by 0.

The calculation of a remainder involves an implicit division. Activating the Protected against Division by Zero option protects the calculation of remainders from a zero divisor.

This option entails a performance penalty, so it should be deactivated to achieve maximum code efficiency.

##### Protected Division against Signed Overflow

This option refers to generated C code, not to model divisions.

A signed overflow on a division occurs if the numerator value -2147483648 is divided by -1: the resulting value 2147483648 cannot be represented in a signed type, therefore, it overflows.

When this option is activated, divisions that might lead to a signed overflow at runtime are embedded, by the code generator, in a conditional operator that checks numerator and denominator of the division and - if necessary - uses the maximum value that can be represented by a signed type as division result.

This does not apply to integer divisions with arithmetic services, because arithmetic services routines are required to protect against signed overflow.

The calculation of a remainder involves an implicit division. Activating the Protected Division against Signed Overflow option also protects the calculation of remainders from signed overflow.

A warning is generated if a potential division by 0 or signed overflow is not protected. By default, the warning is promoted to error (see [Promoting Messages](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm)).

##### Protected Vector Indices

For the [implementation experiment or object-based controller implementation](Build_Options.md), a warning of type WIle77 is issued when the code generator considers the index values of an array or matrix to be in danger of over- or underflow at runtime.

By default, WIle77 is promoted to an error (see [Promoting Messages](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm)).

If the Protected Vector Indices option is deactivated, the warning reads as follows:

index <%1> possibly out of bounds for indexed expression "%2"%3 - will not be limited

If the Protected Vector Indices option is activated, the protection is implemented as a limitation of the index values. The warning now reads:

index <%1> possibly out of bounds for indexed expression "%2"%3 - will be limited

If the array or matrix uses system constants to determine its size (see [Variant Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm)), Protected Vector Indices uses the value of the system constant.

If the array or matrix uses variable size (see [Variable Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm)), Protected Vector Indices uses the actual size.

##### Use Redundant Data Storage

This option allows to activate/deactivate redundant data storage for all elements marked as redundant. See also [Redundant Data Storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm).

##### Generate Define Directives for Enum Values

When this option is deactivated (default), the respective integer values for the enumerators are generated in the code.

When the option is activated, the names of the enumerators (e.g. Red or Green) appear in the generated code, and additional macros of the following kind are generated:

#define Red 0

#define Green 1

Thus, the symbolic names are assigned to the respective integer values.

##### Add Comment with Implementation Information for each Assignment Statement

When this option is activated, a comment is generated in front of each assignment or return statement. This comment contains implementation information on the right-hand side of the assignment.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a2'); //-->

##### Add Comment with Specification Source for each Statement

When this option is activated, a comment is generated in front of each generated assignment. The comment contains the specification source of the assignment.

ESDL: line number

Block diagram: sequence call number

State machine: name of action/condition and respective state/transition

[Example (ESDL)](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a3'); //-->

##### Add Comment with Generation Information for each Component

When this option is activated, comments are created at the beginning of the generated code for each component. The first comment contains information regarding the component and ASCET, the second contains all build and experiment/production code options.

Example: [Comment with Generation Information for a Component](PE_Ex_Comment_w_Generation_Info_for_Component.md)

##### Force Parenthesis for Binary Logical Operators

Enforces parentheses for binary logical operators, according to the [MISRA](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a5'); //--> -C:2004 Guidelines for the use of the C language in critical systems.

If the option is disabled, the generated C code will violate MISRA rule 12.5.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a4'); //-->

##### Add parentheses for readability

Adds parentheses for better readability.

If the option is disabled, the generated C code will violate MISRA rule 12.1.

[Example](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->

##### Allow References without Init Value

When this option is activated, it is possible to generate code for explicit references without intialization.

See also [Initialization of Explicit References](IntroductionEnglishUS.chm::/INT_InitExplicitReferences.htm).

##### Prefix for Component Names

Inserts a character string as prefix for the component names in the generated code.

##### Casting

Allows the selection of a casting strategy. Available selections are [MISRA compliant](PE_MISRA_compliant.md), [Arithmetic Services](PE_ArithmeticServices.md), and [Target Optimized](PE_TargetOptimized.md). The default selection is MISRA compliant.

The ASCET legacy (deprecated) casting is no longer available.

See also

[Component Manager - Promoting Messages](ComponentManagerEnglishUS.chm::/CM_Promoting_Messages.htm)

[Introduction - Variant Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm)

[Introduction - Variable Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm)

[Introduction - Redundant Data Storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm)

[Comment with Generation Information for a Component](PE_Ex_Comment_w_Generation_Info_for_Component.md)

[Introduction - Initialization of Explicit References](IntroductionEnglishUS.chm::/INT_InitExplicitReferences.htm)

[MISRA compliant](PE_MISRA_compliant.md)

[Arithmetic Services](PE_ArithmeticServices.md)

[Target Optimized](PE_TargetOptimized.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
