# Element View

When you select the Element view, the 3 Contents field displays the Elements tab. This tab contains the following columns:

- Name

This column contains names and kind/scope symbols of the elements in the selected component. For messages, message type symbols are shown instead of kind/scope symbols.

- Type

This column contains types and type symbols of the elements in the selected component. For messages, the type symbol represents the data type of the message (e.g. ![](symboltyp_cont.gif), ![](symboltyp_array.gif) etc.), not the message type (send, receive, send & receive).

- MaxSize

This column shows the maximal size of an array, matrix or characteristic line/map. For other elements (i.e. one-dimensional elements and included components), the column is crossed out (---).

<table class="hcp2" x-use-null-cells="">
<col/>
<col/>
<col/>
<tr class="hcp3" valign="top">
<td class="hcp4" colspan="2" rowspan="1">
<p class="tableheadeng">possible values for</p></td>
<td class="hcp4" colspan="1" rowspan="2">
<p class="tableheadeng">description</p></td></tr>
<tr class="hcp3" valign="top">
<td class="hcp4">
<p class="tableheadeng">array</p></td>
<td class="hcp4">
<p class="tableheadeng">matrix</p></td>
</tr>
<tr class="hcp3" valign="top">
<td class="hcp4">
<p class="tablecodeeng">[<span class="guivar">i</span>]</p></td>
<td class="hcp4">
<p class="tablecodeeng">[<span class="guivar">i</span>][<span class="guivar">j</span>]</p></td>
<td class="hcp4">
<p class="tabledefaulteng">x size (and y size) set to integer number <span class="emphasiscode" style="font-style: italic;">i</span> (and <span class="emphasiscode" style="font-style: italic;">j</span>)</p>
<p class="note">For characteristic lines/maps, this is the only possibility.</p></td></tr>
<tr class="hcp3" valign="top">
<td class="hcp4">
<p class="tablecodeeng">[<span class="guivar">sysConst_i</span>]</p></td>
<td class="hcp4">
<p class="tablecodeeng">[<span class="guivar">sysConst_i</span>][<span class="guivar">sysConst_j</span>]</p></td>
<td class="hcp4">
<p class="tabledefaulteng">x size (and y size) determined by system constant 
 <span class="emphasiscode" style="font-style: italic;">sysConst_i</span> (and <span class="emphasiscode" style="font-style: italic;">sysConst_j</span>)</p></td></tr>
<tr class="hcp3" valign="top">
<td class="hcp4">
<p class="tablecodeeng"> </p></td>
<td class="hcp4">
<p class="tablecodeeng">[<span class="guivar">sysConst_i</span>][<span class="guivar">j</span>] 
 / <span class="hcp5"><br/>
[</span><span class="guivar" style="margin-top: 6pt;">i</span><span class="hcp5">][</span><span class="guivar" style="margin-top: 6pt;">sysConst_j</span><span class="hcp5">]</span></p></td>
<td class="hcp4">
<p class="tabledefaulteng">one size fixed, the other determined by a system 
 constant</p></td></tr>
<tr class="hcp3" valign="top">
<td class="hcp4">
<p class="tablecodeeng">[*]</p></td>
<td class="hcp4">
<p class="tablecodeeng">[*][*]</p></td>
<td class="hcp4">
<p class="tabledefaulteng">x size (and y size) variable (see also <a href="IntroductionEnglishUS.chm::/INT_VariableSize_ArraysMatrices.htm">Variable 
 Size for Arrays and Matrices</a>)</p></td></tr>
</table>

- Scope

This column shows the scope of the elements. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Local | Element can only be used within the defining component. |
| Imported | Element is defined in another component, but can be used in the selected, importing component. |
| Exported | Element is defined in the selected component, can be accessed by other components via import. |
| <method name> | Element is the argument, local variable or return value of method <method name> . |
| <process name> | Element is the local variable of process <process name> . |
| <runnable name> | Element is the local variable of runnable entity <runnable name> . |

- Kind

This column shows the kind of the elements. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Constant | Constants store values that can only be read from inside the model. |
| Impl. Cast | Implementation casts provide the ability to specify the implementation at a chosen position of a calculation or a data stream. |
| Method Argument Return Value | The properties of method arguments and return values can be edited only in the signature editor of the method. |
| Parameter | Parameters can only be read from inside the model. They can be calibrated from outside the model. |
| Receive Message | Receive messages (read-only) are used as inputs to a module. |
| Send Message | Send messages (write-only) are used for the results of the computations of a module. |
| Send Receive Message | Send Receive messages can be read and written from inside the model. |
|  | Messages form the input and output variables of processes and are used for inter-process communication. |
| System Constant | System constants are used like constants, but they can be implemented. |
| Variable | Variables can be read and written from inside the model. |
| Reference | Components or complex elements specified as explicit references. |

- Reference

For composite and complex elements, this column shows whether the elements are explicit references (Reference) or not (---).

For method arguments, this column shows the direction (In, Out, InOut).

For imported elements, this column is set to n/a.

- Existence

This column shows whether the elements are real or virtual.

For imported elements, the existence is determined by the exported counterpart; this column is set to n/a. For constants and system constants, the column is crossed out (---).

- Dependency

This column shows whether parameters are independent or dependent. Other elements are always independent.

For imported parameters, the dependency is determined by the exported counterpart; this column is set to n/a. For constants and system constants, the column is crossed out (---).

- Memory

This column shows whether parameters or variables are written to the volatile or nonvolatile memory.

For imported parameters, the memory is determined by the exported counterpart; this column is set to n/a. For constants and system constants, the column is crossed out (---).

- Calibration

This column shows the calibration access (read/write, read only, not Accessible) set for the elements. See also [Calibration Access](ElementEditorEnglishUS.chm::/EEd_CalibrationAccess.htm).

For imported elements, the calibration status is determined by the exported counterpart. This column is set to n/a.

For local elements of methods, processes or runnables, this column is irrelevant; the value is set to ---.

- Unit

This column shows the element unit as specified in the properties editor.

- Comment

This column shows the element comment as specified in the properties editor.

See also

[Views in the Component Manager](ViewsinCM.md)
