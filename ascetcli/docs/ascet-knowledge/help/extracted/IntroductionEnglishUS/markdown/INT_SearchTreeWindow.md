# Search in Tree Window

This dialog window is opened with the ![](buttonSearch.gif) button in the tabs of the component editors' Tree pane.

The Search in Tree window contains the following elements:

- input field

Here, you can enter the search string.

- Search Mode area

The selection in this field affects the Tree pane search in all component editors. It is replaced by the Default Search Mode when ASCET is closed.

Allows the selection of a search mode. Depending on the selected mode, the ![](buttonSearch.gif) button is assigned an overlay icon.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Simple Mode | This mode finds elements whose names contain the search string. |  |
| Wildcard Mode | This mode allows the use of wildcards. It can be used to find elements whose names begin or end with a particular string. ? is the wildcard for a single character * is the wildcard for an arbitrary number of characters |  |
| Type-Ahead Mode | As soon as you enter a search string in the input field, each character stroke will find the next element whose name starts with the current search string, starting at the top of the tree, mark a matching element as long as the search string matches the element name. When you press Enter , the next matching element is found. |  |

- Options area

The options in this field affect the Tree pane search in all component editors. They are kept when ASCET is closed.

- Start Search from Root Node option

If activated, the search starts in the top-level node of the current tab.

- Default Search Mode combo box

Allow the selection of a default search mode (Simple Mode, Wildcard Mode, Type-Ahead Mode, or Last used) for searching the Tree pane tabs. The default search mode is preselected when ASCET is started the next time.

Start Search from Root Node and Default Search Mode can also be set in the Tree Pane node of the ASCET options window. Settings in one of the windows are transferred to the other.

- ![](BUTTON.GIF) Search

Searches the next matching element in the current tab.

- ![](BUTTON.GIF) Close

Closes the window and accepts the settings in the Options area.

See also

[Searching the Tree Pane](INT_SearchTreePane.md)

[Example: Searching the Outline Tab in Type-Ahead Mode](INT_Example_SearchOutline_TypeAhead.md)

[Component Manager - Tree Pane Options](ComponentManagerEnglishUS.chm::/CM_TreePaneOptions.htm)
