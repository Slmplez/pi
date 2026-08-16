# Import Problems Window

The Import Problems window contains the following elements.

- Component / Problem column

Affected component and kind of problem, e.g. unhandled exception, Invalid AMD file (missing), Data for Element <name> missing or Obsolete data for undefined element <name>.

Problems can be of type information (symbol ![](icon_importproblem_info.gif)), warning (symbol ![](icon_importproblem_warn1.gif) and ![](icon_importproblem_warn2.gif)) or error (symbols ![](icon_importproblem_error1.gif) and ![](icon_importproblem_error2.gif)).

- File column

Path and name of the affected file.

- Autofix column

Automatic solution, the possible solutions must be activated for the actions to be performed.

The column is empty for problems without automatic solution.

- Filter options
- Errors

Shows problems of type error.

- Warnings

Shows problems of type warning.

- Information

Shows problems of type information.

- Autofixed Warnings

Shows automatically solved problems of type warning.

- Context menu in the table

- Expand all Nodes

Expands all nodes in the Component / Problem column.

- Select All Autofixes

Activates all automatic solutions in the Autofix column.

- Select Autofixes of this Type

Only available when an entry in the Autofix column is selected. Activates all automatic solutions of the selected type.

- Always Autofix Problems of this Type

Only available when an entry in the Autofix column is selected. Ensures that the solutions of the selected type are, from now on, performed automatically, you do not have to activate these options in the Import Problems window.

- Save Issue List as XML

Saves the window content to an XML file. For some errors, you get additional information.

Such an XML file is helpful when you intend to analyze the problems automatically.

- Edit Autofix Options button (![](button_autofix_edit.gif))

Opens the Options window where settings for automatic problem solutions can be made.

- Select all Autofixes button (![](button_autofix_selall.gif))

Activates all automatic solutions in the Autofix column.

- OK button

Closes the window and performs the activated automatic solutions.

- Cancel button

Closes the window without performing the activated automatic solutions.

See also

[Setting Options for Automatic Problem Solutions](cm_set_options_for_automatic_problem_solutions.md)

[I](CM_Importing_from_AMD_AXL_Files.md)mporting from AMD/AXL Files

[ASCET AMD Import Errors](ASCET_AMD_Import_Errors.md)
