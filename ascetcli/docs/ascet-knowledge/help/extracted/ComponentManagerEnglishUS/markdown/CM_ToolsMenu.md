# Tools Menu (Component Manager)

The Tools menu contains the following options.

##### Documentation

| Column 1 | Column 2 |
| --- | --- |
| Contents | Opens the Documentation Contents window. This is where the items to be documented are selected. |
| Options | Setting options for documentation generation. |

See also: [Automatic Documentation - Overview](AutomaticDocumentationEnglishUS.chm::/AD_Overview.htm)

##### Database

For workspaces, this menu is named Workspace. It contains only the Convert submenu structure.

<table class="hcp1" x-use-null-cells="">
<col style="width: 150px;"/>
<col style="width: 202px;"/>
<col/>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" style="width: 150px;" width="150px">
<p class="tableheadeng">Performance Utilities</p></td>
<td class="hcp3" colspan="2" rowspan="1">
<p class="tabledefaulteng">Opens the <span class="gui">Database Info for:</span><span class="guivar"> &lt;database&gt;</span> window. It provides four, partly 
 combinable, database administration functions.</p></td>
</tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="13" style="width: 150px;" width="150px">
<p class="tableheadeng">Convert</p></td>
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Modify Components to Force Configuration Update</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">All components are set to modified state, so that 
 the next time a component is accessed, its implementation is checked and—if 
 necessary—adjusted.</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">All Names to ANSI C</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">All names in the database/workspace are converted 
 to ANSI C.</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Reserved component names</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Converts reserved component names (see <a href="IntroductionEnglishUS.chm::/INT_Reserved_Keywords.htm">Reserved 
 Keywords</a>) to allowed component names. </p>
<p class="tabledefault">Example: A component AUX is renamed to AUX_1. </p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">System Constants to Constants</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Converts system constants to constants (see <a href="IntroductionEnglishUS.chm::/INT_summaryke.htm">Kind of Elements 
 - Summary</a>).</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Variables to Volatile</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Assigns the volatile attribute to all variables 
 in the database/workspace (see <a href="Assign.md">Assigning the Volatile 
 Attribute to All Variables</a>, <a href="ElementEditorEnglishUS.chm::/EEd_element_configuration.htm">Element 
 Configuration</a> and references therein).</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Parameters to Nonvolatile</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Assigns the non-volatile attribute to all parameters 
 in the database/workspace.</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Components/Elements to Default Memory Location</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Inserts the memory location Default into all element 
 implementations in the database/workspace.</p></td></tr>
<tr class="hcp2">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Convert Local messages in SWCs to Interrunnables</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Converts messages of local scope in SWC to interrunnable 
 variables (see <a href="AtomicSoftwareComponentEditorEnglishUS.chm::/ASC_InterrunnableVariables.htm">Interrunnable 
 Variables</a>).</p></td></tr>
<tr class="hcp2">
<td class="hcp3" style="width: 202px;" width="202px">
<p class="tableheadeng">Convert all array references/arguments/local variables/returns 
 to variable references</p></td>
<td class="hcp3">
<p class="tabledefaulteng">Converts all array references/arguments/local 
 variables/returns in the database/workspace to arrays with variable size 
 (see <a href="IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm">Variable 
 Size for Arrays and Matrices</a>).</p></td></tr>
<tr class="hcp2">
<td class="hcp3" style="width: 202px;" width="202px">
<p class="tableheadeng">Convert all matrix references/arguments/local variables/returns 
 to variable references</p></td>
<td class="hcp3">
<p class="tabledefaulteng">Converts all matrix references/arguments/local 
 variables/returns in the database/workspace to matrices with variable 
 size (see <a href="IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm">Variable 
 Size for Arrays and Matrices</a>).</p></td></tr>
<tr style="x-cell-content-align: top;" valign="top">
<td class="hcp3" style="width: 202px;" width="202px">
<p class="tableheadeng">Convert all old integer types to new integer types 
 where possible</p></td>
<td class="hcp3">
<p class="tabledefaulteng">Searches all projects and their included components 
 in the database/workspace for scalar, array and matrix elements that use 
 the sdisc or udisc types.</p>
<p class="tabledefaulteng">Converts the detected elements to limitInt or 
 wrapInt, if possible. </p>
<p class="tabledefault">See also <a href="CM_Convert_OldIntTypes_NewIntTypes.md">Converting 
 Old Integer Types to New Integer Types</a>.</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Operator Implementations to Impl 
 Casts</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Replaces existing operator implementations with 
 implementation casts (see <a href="ImplementationEditorEnglishUS.chm::/automatic_conversion_op_impl.htm">Automatic 
 Conversion of Operator Implementations</a>).</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 202px;" width="202px">
<p class="tableheadeng">Reset Operator Implementations</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng">Removes all operator implementations from the 
 database/workspace.</p></td></tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 150px;" width="150px">
<p class="tableheadeng">Show Operator Implementations</p></td>
<td class="hcp3" colspan="2" rowspan="1">
<p class="tabledefaulteng">Displays a list of operator implementations in 
 the ASCET monitor window.</p></td>
</tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 150px;" width="150px">
<p class="tableheadeng">Compare Database</p></td>
<td class="hcp3" colspan="2" rowspan="1">
<p class="tabledefaulteng">Compares the current database with a selected 
 second database.</p></td>
</tr>
<tr class="hcp2" style="x-cell-content-align: top;" valign="top">
<td class="hcp3" colspan="1" rowspan="1" style="width: 150px;" width="150px">
<p class="tableheadeng">Show Unreadable Items </p></td>
<td class="hcp3" colspan="2" rowspan="1">
<p class="tabledefaulteng">Lists database items so damaged that they cannot 
 be read by ASCET.</p></td>
</tr>
</table>

##### Arithmetic Service Editor

Opens the editor for arithmetic services for the available targets ([Arithmetic Services - Overview](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)).

| Column 1 | Column 2 |
| --- | --- |
| PC | For the PC target. |
| other targets | Other targets appear if ASCET-RP or ASCET-SE are installed. |

##### Network Settings (Ctrl + Shift + n)

Opens the Network settings for ETAS hardware (Page 1) window, only relevant for ASCET-RP.

##### Views (Ctrl + Shift + v)

Opens the Views window, where views are managed (see [Views](AutomaticDocumentationEnglishUS.chm::/AD_views.htm)).

##### Block Library (Ctrl + Shift + b)

Opens the Block Library Editor window, where block libraries are managed (see [Block Libraries](CM_BlockLibraries.md)).

##### Options (Ctrl + Shift + o)

Opens the Options window, which allows the setting of various options (see [Setting Up ASCET](CM_Setting_Up_ASCET.md)).

##### AUTOSAR to ASCET Converter

Opens the A2A Converter dialog window. This converter transforms the ARXML file(s) containing all necessary information describing a software component (i.e. AUTOSAR types, interfaces, software component type) into the AMD format. Afterwards, ASCET imports the AMD files into the active database or workspace.

See also

[Automatic Documentation - Overview](AutomaticDocumentationEnglishUS.chm::/AD_Overview.htm)

[Converting a Database to ANSI C](ConverttoANSIC.md)

[Reserved Keywords](IntroductionEnglishUS.chm::/INT_Reserved_Keywords.htm)

[Kind of Elements - Summary](IntroductionEnglishUS.chm::/INT_summaryke.htm)

[Assigning the Volatile Attribute to All Variables](Assign.md)

[Assigning the Non-Volatile Attribute to All Parameters](non-volatile.md)

[Interrunnable Variables](AtomicSoftwareComponentEditorEnglishUS.chm::/ASC_InterrunnableVariables.htm)

[Variable Size for Arrays and Matrices](IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm)

[Converting Old Integer Types to New Integer Types](CM_Convert_OldIntTypes_NewIntTypes.md)

[Automatic Conversion of Operator Implementations](ImplementationEditorEnglishUS.chm::/automatic_conversion_op_impl.htm)

[Converting Operator Implementations to Implementation Casts](ImplementationEditorEnglishUS.chm::/replace_op_impl.htm)

[Removing Operator Implementations in the Database/Workspace](ImplementationEditorEnglishUS.chm::/remove_op_impl_compo.htm)

[Arithmetic Services - Overview](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)

[Opening the Arithmetic Services Editor](ArithmeticServicesEnglishUS.chm::/launching_as_editor.htm)

[Views](AutomaticDocumentationEnglishUS.chm::/AD_views.htm)

[Block Libraries](CM_BlockLibraries.md)

[Setting Up ASCET](CM_Setting_Up_ASCET.md)

[Setting Options for ASCET](SettingASCET.md)

For binary databases, see also

[Optimizing a Database](Optimize.md)

[Database Info Dialog Window](DatabaseDialog.md)

[Searching for Operator Implementations](ImplementationEditorEnglishUS.chm::/search_op_impl.htm)

[Comparing Two Databases](CompareTwo.md)

[Searching Unreadable Database Items](CM_Search_Unreadable_Items.md)
