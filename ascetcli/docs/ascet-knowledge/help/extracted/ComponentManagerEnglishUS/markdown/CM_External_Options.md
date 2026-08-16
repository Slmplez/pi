# External Options

It is possible to include user-defined options. This takes place using an XML file which you modify to suit your own requirements. The file is stored in the ASCET installation directory; for ASCET to recognize it, it must have the extension *.aod.xml.

This topic contains three subsections:

- [Basic Option Definition](#GeneralOptionDefinition)
- [Meaning of the Attributes and Items](#Meaning)
- [Available optionClasses for User-Defined Options](#Available)

## Basic Option Definition

The definition of an option has the following basic format (code sections in italics must be replaced with suitable values for each option):

<OptionDeclaration

optionCategory="value"

attributeName="option name"

optionClass="type"

xmlCategory="path"

visible="value"

sensitive="value"

optionFile="filename.xml">

<Group>path</Group>

<Label>text</Label>

<Description>text</Description>

<Tooltip>text</Tooltip>

<InitialValue>value</InitialValue>

<DefaultValue>value</DefaultValue>

</OptionDeclaration>

The meaning of the attributes and items is listed in [Table 1](#Meaning).

Some option types have additional items, these are described in [Table 2](#Available).

Your installation disk contains the sample file externalOptionsExample.aod.xml; see also [Example: External Options File](cm_exampleexternaloptionsfile.md). This file defines the options shown here:

![](asd_options_extern.gif)

## Meaning of the Attributes and Items

This table describes the attributes and items of the basic option definition.

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tablehead">Attribute/Item</p></td>
<td class="hcp3">
<p class="tablehead">Meaning</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">optionCategory</span></p></td>
<td class="hcp3">
<p class="tabledefault">Way the option is saved (<span class="gui">FILE</span> 
 – in a file, <span class="gui">FIXED</span> – not saved).</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">attributeName</span></p></td>
<td class="hcp3">
<p class="tabledefault">Name of the option in the XML file from optionFile. 
 Has to be unique in the *.aod.xml file.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">optionClass</span></p></td>
<td class="hcp3">
<p class="tabledefault">Type of option, for possible values see <a href="#Available">Table 
 2</a>. </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">xmlCategory</span><span class="emphasiscode" style="vertical-align: Super;">1</span></p></td>
<td class="hcp3">
<p class="tabledefault">Path under which the option in the XML file from 
 optionFile 
 is stored, e.g. <span class="gui">Sample\Option</span>.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">visible</span><span class="emphasiscode" style="vertical-align: Super;">2</span></p></td>
<td class="hcp3">
<p class="tabledefault">Determines whether the option is visible (<span class="gui">visible="true"</span>) 
 or not (<span class="gui">visible="false"</span>).</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">sensitive</span><span class="emphasiscode" style="vertical-align: Super;">2</span></p></td>
<td class="hcp3">
<p class="tabledefault">Determines whether the option can be edited (<span class="gui">sensitive="true"</span>) or not (<span class="gui">sensitive="false"</span>).</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">optionFile</span><span class="emphasiscode" style="vertical-align: Super;">1</span></p></td>
<td class="hcp3">
<p class="tabledefault">XML file in which the value of the option is stored. 
 </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;Group&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Path (<span class="guivar">Node\Subnode\...</span>) 
 of the option in the ASCET options window, either new or existing.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;Label&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Name of the option in the ASCET options window.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;Description&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Short description of the option. Will be shown in 
 the bottom right field of the ASCET options window.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;Tooltip&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Tooltip text of the option in the ASCET options window.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;InitialValue&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Initial value, is only used if no value from optionFile 
 is saved in the XML file.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault"><span class="emphasiscode">&lt;DefaultValue&gt;</span></p></td>
<td class="hcp3">
<p class="tabledefault">Default value, is used for <span class="gui">System 
 Defaults</span> and as an initial value if <span class="emphasiscode">&lt;InitialValue&gt;</span> 
 is not set.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="2" rowspan="1">
<p class="tabledefaulteng">1: The values of several options can be stored 
 in the same XML file and/or under the same path.</p>
<p class="tabledefault">2: Can be omitted. Treated as true, if omitted.</p></td>
</tr>
</table>

## Available optionClasses for User-Defined Options

This table describes the optionClasses available for the creation of user-defined options. If an optionClass requires more items than the basic definitions, or special settings for the basic definition, these are listed here, too.

Code sections in italics must be replaced with suitable values for each option.

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tablehead">optionClass</p></td>
<td class="hcp3">
<p class="tablehead">Explanation</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">EtasBooleanOption</p></td>
<td class="hcp3">
<p class="tabledefault">Option box, can be activated or deactivated</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">EtasButtonOption</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">Button that executes a command.</p>
<p class="tabledefault"><span class="emphasiscode">&lt;InitialValue&gt;</span> 
 and <span class="emphasiscode">&lt;DefaultValue&gt;</span> are left empty 
 or set to <span class="gui">ignored</span>.</p>
<p class="tabledefault">Additional items for the definition:</p>
<p class="code">&lt;ButtonOption&gt;</p>
<p class="code">   &lt;Action&gt;<span class="guivar">path/executable file</span>&lt;/Action&gt;</p>
<p class="code">&lt;/ButtonOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tabledefault">EtasEnumerationOption</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">Combo box for selecting a character string.</p>
<p class="tabledefault">Additional items for the definition:</p>
<p class="code">&lt;EnumerationOption&gt;</p>
<p class="code">   &lt;StringValues&gt;<span class="hcp4">1</span></p>
<p class="code">      &lt;StringValue&gt;<span class="guivar">string1</span>&lt;/StringValue&gt;</p>
<p class="code">      ...</p>
<p class="code">      &lt;StringValue&gt;<span class="guivar">stringN</span>&lt;/StringValue&gt;</p>
<p class="code">   &lt;/StringValues&gt;</p>
<p class="code">   &lt;Values&gt;<span class="hcp4">2</span></p>
<p class="code">     &lt;Value&gt;<span class="guivar">value1</span>&lt;/Value&gt;</p>
<p class="code">      ...</p>
<p class="code">      &lt;Value&gt;<span class="guivar">valueN</span>&lt;/Value&gt;</p>
<p class="code">   &lt;/Values&gt;</p>
<p class="code">&lt;/EnumerationOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">1: The string values <span class="emphasiscode">string1</span> 
 .. <span class="emphasiscode">stringN</span> appear in the combo box.</p>
<p class="tabledefault">2: The numerical values represented by the string 
 values. If omitted, <span class="emphasiscode">value1</span> .. <span class="emphasiscode">valueN</span> 
 are set to the integer numbers <span class="emphasiscode">0</span> .. <span class="emphasiscode">n-1</span>.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tabledefault">EtasEditableEnumerationOption</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">Combo box for selecting a character string, plus 
 an Edit button.</p>
<p class="tabledefault">Additional items for the definition:</p>
<p class="code">&lt;EnumerationOption&gt;</p>
<p class="code">   &lt;StringValues&gt;<span class="hcp4">1</span></p>
<p class="code">      ...</p>
<p class="code">   &lt;/StringValues&gt;</p>
<p class="code">   &lt;Values&gt;<span class="hcp4">2</span></p>
<p class="code">      ...</p>
<p class="code">   &lt;/Values&gt;</p>
<p class="code">   &lt;Action&gt;<span class="guivar">path/executable file</span>&lt;/Action&gt;</p>
<p class="code">&lt;/EnumerationOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">1: Same as <span class="emphasiscode">&lt;StringValues&gt;</span> 
 for EtasEnumerationOption</p>
<p class="tabledefault">2: Same as <span class="emphasiscode">&lt;Values&gt;</span> 
 for EtasEnumerationOption</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">EtasFileOption</p></td>
<td class="hcp3">
<p class="tabledefault">Text field for path and name of a file as well as 
 a button for file selector window.</p>
<p class="tabledefault">Additional items for the definition:</p>
<p class="code">&lt;FileOption&gt;</p>
<p class="code">   &lt;DialogTitle&gt;<span class="guivar">text</span>&lt;/DialogTitle&gt;</p>
<p class="code">   &lt;SearchPath&gt;<span class="guivar">path</span>&lt;/SearchPath&gt;</p>
<p class="code">   &lt;SearchMask&gt;<span class="guivar">mask</span>&lt;/SearchMask&gt;</p>
<p class="code">   &lt;InvalidCharacters&gt;<span class="guivar">characters</span>&lt;/InvalidCharacters&gt;</p>
<p class="code">   &lt;FilterTypes&gt;</p>
<p class="code">      &lt;FilterType<span class="guivar">filter</span>&gt;</p>
<p class="code">         &lt;Description&gt;<span class="guivar">text</span>&lt;/Description&gt;</p>
<p class="code">      &lt;/FilterType&gt;</p>
<p class="code">      ...</p>
<p class="code">   &lt;/FilterTypes&gt;</p>
<p class="code">&lt;/FileOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p>EtasFloatOption</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">Additional items for the definition: </p>
<p class="code">&lt;FloatOption&gt;<span class="hcp4">1</span></p>
<p class="code">   &lt;MinValue&gt;<span class="guivar">value</span>&lt;/MinValue&gt;</p>
<p class="code">   &lt;MaxValue&gt;<span class="guivar">value</span>&lt;/MaxValue&gt;</p>
<p class="code">&lt;/FloatOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">1: Can be omitted. If <span class="emphasiscode">&lt;FloatOption&gt;</span> 
 is omitted, the option can have values between -100000.0 and 100000.0. 
 For min/max values beyond ]-100000.0 .. 100000.0[, you must use <span class="emphasiscode">&lt;FloatOption&gt;.</span></p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tabledefault">EtasNumericOption</p></td>
<td class="hcp3">
<p class="tabledefault">Entry field with arrow buttons for integer values.</p>
<p class="tabledefault">Additional items for the definition:</p>
<p class="code">&lt;NumericOption&gt;<span class="hcp4">1</span></p>
<p class="code">   &lt;MinValue&gt;<span class="guivar">value</span>&lt;/MinValue&gt;</p>
<p class="code">   &lt;MaxValue&gt;<span class="guivar">value</span>&lt;/MaxValue&gt;</p>
<p class="code">&lt;/NumericOption&gt;</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefaulteng">1: Can be omitted. If <span class="emphasiscode">&lt;NumericOption&gt;</span> 
 is omitted, the option can have values between -99999 and 99999. For min/max 
 values beyond [-99999 .. 99999], you must use <span class="emphasiscode">&lt;NumericOption&gt;.</span></p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">EtasPathOption</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefault">Text field for directory path button for <span class="gui">Path 
 Selection</span> window.</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tabledefault">EtasStringOption</p></td>
<td class="hcp3">
<p class="tabledefault">Text field for entering a character string.</p></td></tr>
</table>
