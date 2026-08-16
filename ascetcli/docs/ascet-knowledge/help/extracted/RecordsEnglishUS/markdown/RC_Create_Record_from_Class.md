# Creating a Record from an Existing Class

A record can be created from an existing ASCET class. To do so, proceed as follows.

1. In the Component Manager, select the class you want to reproduce as record.

You can convert classes specified as block diagrams, in ESDL or C code, Boolean tables and conditional tables. State machines and CT blocks cannot be converted into records.

1. In the Edit menu, point to Reproduce As and select Record.

The new record is created in the same folder as the original one. It is named Record_<class name>. The new record contains all local variables from the class that are allowed in a record.

Class elements of other [kind](IntroductionEnglishUS.chm::/INT_summaryke.htm) than variables (e.g., parameter, system constant, constant), or of other [scopes](IntroductionEnglishUS.chm::/INT_the_scope_of_elements.htm) than local, are not included in the record. Even classes in the converted class are neither included in the record nor converted into records themselves.

1. Double-click on the new item to open the record editor.

See also

[Component Manager - Copying Database/Workspace Items and Structures](ComponentManagerEnglishUS.chm::/copying_databaseitems.htm)

[Opening a Record](RC_Opening_a_Record.md)

[Allowed Content](RC_Allowed_Content.md)

[The Kind of Elements - Summary](IntroductionEnglishUS.chm::/INT_summaryke.htm)

[The Scope of Elements](IntroductionEnglishUS.chm::/INT_the_scope_of_elements.htm)
