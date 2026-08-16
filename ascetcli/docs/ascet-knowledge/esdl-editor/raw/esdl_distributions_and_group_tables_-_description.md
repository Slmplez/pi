# Distributions and Group Tables - Description

Characteristic lines and maps can be related to each other by using the same set of sample points. In ASCET, such a shared set of sample point is modelled as a distribution, tables that use the sample points in a distribution are referred to as group tables.

A distribution is an array of sample points. Unless specified otherwise in the Editors \ Calibration \ Table Editors node of the ASCET options window, the sequence must be strictly increasing. Distributions can be used for both types of tables (one- and two-dimensional). Two-dimensional tables require a distribution for each dimension.

Using distributions and group tables can significantly reduce the time and memory required for computations since interpolation factors are computed only once and can be reused over a set of tables.

Adding a group table in the ESDL Editor consists of first adding a distribution and then a group table. When the group table is added, the system prompts for the corresponding distribution. Since the ESDL Editor cannot be used to reassign distributions to existing group tables, distributions should always be created before adding the tables.

Like normal and fixed characteristic tables, distributions and group tables are adaptive in ESDL, i.e. methods are available that can be used to alter the characteristic line during execution of a function without user interaction. The methods are listed in [Public Interface of Distributions and Group Tables](ESDL_Public_Interface_of_Distributions_and_Group_Tables.md).

The [Table Editor](../../data-editor/raw/DEd_DataEditor_CombinedTypes.md) can be used to edit the data of both distributions and tables. Data can also be filed in from tab-delimited ASCII files.

See also

[Public Interface of Distributions and Group Tables](ESDL_Public_Interface_of_Distributions_and_Group_Tables.md)

[Description of the Table Editor](../../data-editor/raw/DEd_DataEditor_CombinedTypes.md)
