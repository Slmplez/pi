- Name field

This field contains the element name.

- Unit field

In this field, you can enter a unit for the element.

- Comment field

In this field, you can enter a comment for the element.

- Dimension field

Available only for arrays, matrices, characteristic lines/maps.

This field displays the dimension of the element.

- X and Y fields

In these fields, you can enter the maximum X (and Y) size of the element.

- Variant Size area

Available only for arrays and matrices.

In the combo box(es), you can select system constants you want to use as dimension values.

Possible selections are <No Selection> or available system constants of type udisc or enum ([variant size](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm)) or - for arrays/matrices of kind variable and specified as explicit references - * ([variable size](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm)).

- Interpolation combo box

Available only for characteristic lines and maps.

This combo box offers all available interpolation routines. By default, Rounded and Linear are available; further routines can be added by the user (see [User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)).

- Kind field

This field contains a selection of the following options for the element kind: Constant, System Constant, Parameter, Variable, Interrunnable Variable, Message, Input, Output. One of them is selected at a time.

Input and Output are available only for inputs and outputs in state machines.

Beginning with ASCET V6.4, Message can also be available for arrays and matrices.

- Basic Type combo box

This combo box contains the following options for the element type: Logic, Signed Discrete, Unsigned Discrete, Limited Integer, Wrap-Around Integer, Continuous, Enumeration. One of them is selected at a time.

- Component combo box

Available only for enumerations and mode groups.

This combo box offers all enumerations/mode groups available in the database or workspace, together with the respective path.

- Min and Max fields

These fields contain lower and upper limit for a [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) or [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) argument.

For limitInt, the values in Min and Max must be representable in sint32 or uint32.

For wrapInt, the values in Min and Max must be representable in the selected Type.

- [context menu](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a8'); //--> in the Min field
- [context menu](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a9'); //--> in the Max field

- Type combo box

This combo box contains the possible types for a wrapInt element.

- Default Value

Inserts the default minimum value for the selected type.

- Copy (Ctrl + c)

Copies the selected field content to the clipboard.

- Paste (Ctrl + v)

Inserts the clipboard content into the Min field.

- 0 (minimum for uint*)
- -2^7 (-128) (minimum for sint8)
- -2^15 (-32768) (minimum for sint16)
- -2^31 (-2147483648) (minimum for sint32)

Inserts the respective value.

- Default Value

Inserts the default maximum value for the selected type.

- Copy (Ctrl + c)

Copies the selected field content to the clipboard.

- Paste (Ctrl + v)

Inserts the clipboard content into the Min field.

- 2^7-1 (127) or 2^8-1 (255) (maximum for sint8 / uint8)
- 2^15-1 (32767) or 2^16-1 (65535) (maximum for sint16 / uint16)
- 2^31-1 (2147483647) or 2^32-1 (4294967295) (maximum for sint32 / uint32)

Inserts the respective value.

This area contains the following options for the element scope.

One of these options is selected at a time. See also [Editing the Element Scope](EEd_EditElementScope.md).

- Local

Select this option if the element shall be used only in the current project.

- Imported

- Exported

Select this option if the element shall be used in other projects/components.

- buttons

The buttons are only available for an element with scope Imported. See also [Imported Elements](EEd_ImportedElements.md).

- ![](buttonGoToExport.gif) Go to Export

Opens the properties editor for the corresponding exported element.

- ![](buttonSynchrWithExport.gif) Synchronize with Export

Sets the available properties to the values of the corresponding exported element.

The buttons are not available in the following cases:

- The imported element has no matching exported element in the current project context.
- The properties editor was opened for several imported elements at the same time.
- The component that provides the exported element is read-protected.

- Reference option

This option is to be set if the element is a reference of another element.

This option is available for arrays, matrices, characteristic lines/maps of the kind Variable.

- Virtual option

This option specifies if the element is a virtual variable or parameter.

- Dependent option

This option determines whether the parameter depends on another element.

This option is only available for parameters.

- ![](button_formula.gif) Formula

This button opens the [formula editor](EEd_Formula_Editor_Dependent_Parameters.md) for dependent parameters.

This button is only available if Dependent is activated.

- Non-volatile option

If activated, this option places the element in the non-volatile memory area of the target.

For variables, Non-volatile and Virtual cannot be activated simultaneously.

- Variants option

This option determines whether variant handling is available for this element or not.

Variants is only available for parameters.

- Redundant option

This option activates [redundant data storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm) for the element.

Redundant can only be activated for local or exported variables (scalar or composite) or messages. Redundant and Non-volatile must not be activated simultaneously. Redundant and Virtual cannot be activated simultaneously.

- Set() Method option

Adds a Set port for the selected element. The element is enabled and can be written from outside the component.

- Get() Method option

Adds a Get port for the selected element. An output for the element is added to the component.

You have to actively set the Get() Method and Set() Method options for messages to add the respective inputs and outputs to the module layout.

The following options are available for [explicit references](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm) (i.e. arrays, matrices, characteristic lines/maps with activated Reference attribute):

- Read for Referenced Element option

If this option is active, the internal access to the referenced element is set to Read.

- Write for Referenced Element option

It is not possible to disable both options at the same time.

For arrays, matrices, characteristic lines/maps not specified as explicit reference, the Internal Access field contains the options Write and Read, which are both activated and set to read-only.

The following options are only available for elements of the type Message:

- Send option

If this option is active, the internal access is set to Send.

- Receive option

If this option is active, the internal access is set to Receive.

The options determine the access to an element.

- Write option

Only editable for parameters.

Write access to the element. If Write is activated, Read is activated, too.

- Read option

Read access to the element.

See also [Editing the Calibration Access](EEd_EditCalibrationAccess.md).

# Properties Editor for Basic Elements

This window applies to scalar variables, parameters and (system) constants, arrays, matrices, characteristic lines/maps, enumerations. It contains the following elements (some of them are unavailable in certain cases).

##### [Area](javascript:kadovTextPopup(this))General<!-- kadovTextPopupInit('a1'); //-->

##### [Area](javascript:kadovTextPopup(this))Basic Type<!-- kadovTextPopupInit('a2'); //-->

##### [Area](javascript:kadovTextPopup(this))Scope<!-- kadovTextPopupInit('a3'); //-->

These options are not available for AUTOSAR components.

##### [Area](javascript:kadovTextPopup(this))Attributes<!-- kadovTextPopupInit('a4'); //-->

For imported elements in a defined project context, the area is named Attributes (derived from export); for imported elements without project context, it is named Attributes (no export found).

##### [Area](javascript:kadovTextPopup(this))External Access<!-- kadovTextPopupInit('a5'); //-->

These options are not available for AUTOSAR components.

##### [Area Internal Access](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a6'); //-->

##### [Area Calibration Access](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a7'); //-->

For imported elements in a defined project context, the area is named Calibration (derived from export); for imported elements without project context, it is named Calibration (no export found).

##### Always Show Editor for new Elements

This option determines whether the properties editor opens automatically if a new element of the selected kind is created.

![](BUTTON.GIF) OK

Closes the properties editor and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the properties editor and discards the settings.

You can

[Edit the configuration of a scalar element](EEd_edit_element_configuration.md)

[Edit the configuration of a composite element](eed_editconfiguration_compositeelement.md)

[Specify an array or matrix with variable size](Eed_SpecifyArrayMatrix_VariableSize.md)

[Specify a reference](EEd_Specifying_a_Reference.md)

See also

[Variant Size of Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariantSize_ArraysMatrices.htm)

[Scalar Types - Limited Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm)

[Scalar Types - Wrap-Around Integer](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm)

[User-Defined Interpolation Routines](IntroductionEnglishUS.chm::/INT_UserDefinedInterpolationRoutines.htm)

[Editing the Element Scope](EEd_EditElementScope.md)

[Imported Elements](EEd_ImportedElements.md)

[Formula Editor for Dependent Parameters](EEd_Formula_Editor_Dependent_Parameters.md)

[Redundant Data Storage](IntroductionEnglishUS.chm::/INT_RedundantDataStorage.htm)

[Explicit References](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm)

[Editing the Calibration Access](EEd_EditCalibrationAccess.md)

/* Heikki Komulainen, Comet Computer GmbH 2004 */ cc_plus_pic = '<img src="./images/exp_plus.gif" border="0">&nbsp;'; cc_minus_pic = '<img src="./images/exp_minus.gif" border="0">&nbsp;'; cc_stat_pic = '<img src="./images/statisch.gif" border="0">&nbsp;'; gpstyle = '<style type="text/css">'; gpstyle = gpstyle + '.CCGENPOPTEXTH{display:none;}'; gpstyle = gpstyle + '.CCGENPOPTEXTV{display:block;margin-left:13px;padding-bottom:20px}'; gpstyle = gpstyle + '.CCPLUSMINUS{text-decoration:none;cursor:default;font-size:10px;}'; gpstyle = gpstyle + '</style>'; var iframes_created = 0; if (document.body && document.body.insertAdjacentHTML && document.getElementsByTagName && document.getElementById) { collect_popups(); set_poplinks_pictures(); if (iframes_created) { document.write(gpstyle); document.write('<p><nobr><a id="einauslink" style="position:absolute;top:expression(document.body.scrollTop + this.offsetHeight - this.offsetHeight);left:expression(document.body.offsetWidth - (this.offsetWidth + 28));background:white;padding:5px" href="javascript:show_all_poptext()">Alle texte einblenden</a></nobr></p>'); } } function collect_popups() { bsscpopups = new Array(); for (x = 0; x < document.links.length; x++) { if (document.links[x].href.indexOf("BSSCPopup")>-1) { seekmatch = /BSSCPopup.'[^'](.+)'/; poplink = seekmatch.exec(document.links[x].href); poplink = "" + poplink; poplink = poplink.substring(poplink.indexOf("'")+1, poplink.lastIndexOf("'")); ifid = "CCGENIFRAMEID" + x; new_iframe = '<iframe id="' + ifid + '"src="' + poplink + '" onload="get_text(\'' + ifid + '\')" width="0" height="0" frameborder=0></iframe>'; document.links[x].parentNode.insertAdjacentHTML("afterEnd", new_iframe); gpid = "CCID_" + ifid; document.links[x].href = "javascript:expand_poptext('" + gpid + "')"; cc_plus = '<span id="CCPMB_' + gpid + '" class="CCPLUSMINUS">' + cc_plus_pic + '</span>'; document.links[x].insertAdjacentHTML("afterBegin", cc_plus); iframes_created = 1; } } }// end function function get_text(ifr_id) { frpars = document.frames[ifr_id].document.getElementsByTagName("body"); popbody = frpars[0].innerHTML; gpid = "CCID_" + ifr_id; if (!document.getElementById(gpid)) { //avoiding doubles document.getElementById(ifr_id).insertAdjacentHTML("afterEnd", '<div id ="'+gpid+'" class="CCGENPOPTEXTH">'+popbody+'</div>'); } }//end function function expand_poptext(x_frame_id) { if (!document.getElementById(x_frame_id)) return; if (document.getElementById(x_frame_id).className == "CCGENPOPTEXTH") { document.getElementById(x_frame_id).className = "CCGENPOPTEXTV"; document.getElementById(x_frame_id).style.visibility = "visible"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_minus_pic; } } else { document.getElementById(x_frame_id).className = "CCGENPOPTEXTH"; document.getElementById(x_frame_id).style.visibility = "hidden"; if (document.getElementById("CCPMB_" + x_frame_id )) { document.getElementById("CCPMB_" + x_frame_id ).innerHTML = cc_plus_pic; } } }// end function function show_all_poptext() { var pulldowntxt = document.getElementsByTagName("div"); for (b = 0; b < pulldowntxt.length; b++) { if (pulldowntxt[b].className == "droptext") { pulldowntxt[b].style.display=""; } } var gptxt = document.getElementsByTagName("div"); for (z = 0; z < gptxt.length; z++) { if (gptxt[z].className == "CCGENPOPTEXTH") { gptxt[z].className = "CCGENPOPTEXTV"; gptxt[z].style.visibility = "visible"; if (document.getElementById("CCPMB_" + gptxt[z].id )) { document.getElementById("CCPMB_" + gptxt[z].id ).innerHTML = cc_minus_pic; } } } var dxpoplinks = document.getElementsByTagName("a"); if (dxpoplinks) { for (pxl = 0; pxl < dxpoplinks.length; pxl++) { if (dxpoplinks[pxl].href.indexOf("kadovTextPopup")>-1) { if (document.getElementById("CCPMB_" + dxpoplinks[pxl].id)) { document.getElementById("CCPMB_" + dxpoplinks[pxl].id).innerHTML = cc_stat_pic; dxpoplinks[pxl].symbol = "minus"; } } } } document.getElementById('einauslink').innerText = 'Alle texte ausblenden'; document.getElementById('einauslink').href = "javascript:self.location.reload()"; self.focus(); }// end function function eat_click() { return false; }// end function function set_poplinks_pictures() { var dpoplinks = document.getElementsByTagName("a"); if (dpoplinks) { for (pl = 0; pl < dpoplinks.length; pl++) { if (dpoplinks[pl].href.indexOf("kadovTextPopup")>-1) { cc_plus = '<span id="CCPMB_' + dpoplinks[pl].id + '" class="CCPLUSMINUS">' + cc_stat_pic + '</span>'; //dpoplinks[pl].onmouseup = plusminuspoplink; dpoplinks[pl].insertAdjacentHTML("afterBegin", cc_plus); dpoplinks[pl].symbol = "plus"; } } } }// end function function plusminuspoplink() { if (document.getElementById("CCPMB_" + this.id)) { if (this.symbol == "plus") { document.getElementById("CCPMB_" + this.id).innerHTML = cc_minus_pic; this.symbol = "minus"; } else { document.getElementById("CCPMB_" + this.id).innerHTML = cc_plus_pic; this.symbol = "plus"; } } return true; }
