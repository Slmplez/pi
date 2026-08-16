# Experimenting with Conditional Tables

Once you have specified the table completely, you can generate code and execute experiments as for other components (see [Analyzing Components](BlockDiagramEditorEnglishUS.chm::/AnalyzingComponents.htm)).

The following problems may occur during code generation:

1. Any incorrect entries made when specifying the conditions and instructions result in error messages.
1. If you have specified identical conditions in different rows of the condition area, all corresponding If…Then… rows are generated during code generation but only the first one is taken into consideration when the table is evaluated.

No warning is displayed as there is no check of the content of the table.

1. If you delete, add or move enumerators in an enumeration used by the conditional table, this may lead to inconsistencies in the conditional table. A relevant error message may be displayed during code generation.
1. If you delete an enumeration used by the conditional table from the database or workspace, the enumeration is treated as an undefined element in code generation, a corresponding error message is displayed.

The conditional table can only be invoked via the trigger method. The following steps are executed every time the table is invoked:

1. The method arguments of the trigger method are processed and the values assigned to the elements.
1. A search takes place for a suitable condition. As soon as a suitable condition is found, the search is canceled, even if there are other suitable conditions specified further down.

If there is no suitable condition, the default condition (default row) is selected.

1. The instructions belonging to the condition found are executed.

As trigger cannot have a return value, the results of the instructions have to be transferred using Get Ports (see Making Elements Accessible Using Get/Set Ports). To ensure data consistency at all times, it is not recommended that you use global variables.

As with all ESDL components, the code is displayed for an offline experiment in the Physical Experiment window. This is the only point at which the user sees the ESDL code.

You can set up and execute the experiment as described in [The Experimentation Environment](ExperimentationEnglishUS.chm::/EE_Overview.htm).

See also

[Analyzing Components](BlockDiagramEditorEnglishUS.chm::/AnalyzingComponents.htm)

[The Experimentation Environment - Overview](ExperimentationEnglishUS.chm::/EE_Overview.htm)

[Starting an Offline Experiment](CTab_Starting_an_Offline_Experiment.md)
