# Dependent Parameters

Model parameters can be connected to other system or model parameters via a mathematical dependency. Calibrating parameters can therefore lead to inconsistencies.

To avoid possible inconsistencies from parameter calibration, it is possible within ASCET to specify the dependency of a parameter in the specification editors. The dependency of a parameter is represented by a mathematical formula.

A dependent parameter can depend on a non-dependent, or "master" parameter either directly or indirectly:

- direct dependency

dependentParam1 = f(masterParam)

- indirect dependency

dependentParam1 = f1(dependentParam2) with dependentParam2 = f2(masterParam)

Only parameters of [scope](INT_the_scope_of_elements.md) local or exported can be specified as dependent parameters. Dependent parameters of scope imported are not allowed. Dependent variables do not exist.

While dependent parameters of scope imported are not allowed, you can import dependent parameters exported in another component of your model, see [Importing Dependent Parameters](INT_Importing_Dependent_Parameters.md).

See also

[The Scope of Elements](INT_the_scope_of_elements.md)

[Properties Editor - Creating the Formula for Dependent Parameters](ElementEditorEnglishUS.chm::/EEd_create_fromula_dependent.htm)

[Data Editor - Editing Dependent Parameters](DataEditorEnglishUS.chm::/DEd_Editing_Dependent_Parameters.htm)

[Importing Dependent Parameters](INT_Importing_Dependent_Parameters.md)

[Experimentation - Dependent Parameters in the Experiment](ExperimentationEnglishUS.chm::/EE_DepParam_in_Experiment.htm)
