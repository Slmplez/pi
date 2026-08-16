# Context Menu Specification View

The context menu of the Specification view contains the following functions:

- Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) dialog window. All available views are listed, and the visibility of the diagram element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

- Create ASCET Link

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the selected object in the drawing area.

- State Layout

Available for states and junctions.

| Column 1 | Column 2 |
| --- | --- |
| Copy Layout | Copies the layout of the selected state/junction to the ASCET clipboard. |
| Paste Layout | Copies the state layout from the ASCET clipboard to the selected state/junction. |

See also: [Copying a State Layout](copy_statelayout.md)

- Edit State

Only available for states.

Opens the [state editor](SM_State_Editor_Window.md) for the selected state.

- Edit Transition

Only available for transitions.

Opens the [transition editor](SM_Transition_Editor_Window.md) for the selected transition.

- Edit Action

Available for states and transitions.

- For states, Edit Action contains a submenu with the following entries:

<table style="x-cell-content-align: Top;
				margin-top: 3px;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;
				margin-bottom: 6px;
				margin-left: 1.522cm;" x-use-null-cells="">
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Entry</p></td>
<td colspan="1" rowspan="3" style="padding-top: 2px;
			padding-bottom: 2px;
			border-left-style: Inset;
			border-top-style: Inset;
			border-right-style: Inset;
			border-bottom-style: Inset;
			padding-left: 2px;
			padding-right: 2px;
			border-left-width: 1px;
			border-top-width: 1px;
			border-right-width: 1px;
			border-bottom-width: 1px;
			x-cell-content-align: center;" valign="middle">
<p class="tabledefaulteng">Opens the state editor for the selected state 
 in the respective <span class="guivar"><a href="SM_Action_Tab.md">&lt;action&gt;</a></span> 
 tab.</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tableheadeng">Static</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tableheadeng">Exit</p></td>
</tr>
</table>

- For transitions, Edit Action opens the transition editor in the [Action](SM_ActionTrans_Tab.md) tab.
- Edit Condition

Only available for transitions.

Opens the transition editor in the [Condition](SM_Condition_Tab.md) tab.

- History

Only available for hierarchy states.

Assigns a history to a hierarchy state. See also [Setting up a Hierarchy State with a History](SetupHierarchy.md).
