# Data Sets

Every component or project can have a number of data sets. Data sets determine the initial values of the elements, i.e. parameters and variables, and of the components. A data set contains one initialization value for each element of the component or project. Therefore, data sets define variants of components and projects.

Data sets are handled in the same way as for components and projects. Each component data set includes the initial values for all the basic elements used in that component. For complex elements, which have their own data sets, the component data set has a reference to one of the data sets of the complex element.

Each component can have several data sets. When a component is first created, a default data set with the name Data is created with it.

There is one major difference between components and projects, namely that projects have global elements as well as the components they reference. In contrast to the data for the components, where a project can have several data sets, there is only one data set for the global elements.

Once you have set the data exchange options for your system, you can use the data exchange tool set to import and export data sets. The tool set can be accessed through the corresponding menu choices in the data set editor.

See also

[Viewing Data Sets](DEd_view_data.md)

[Creating or Coping a New Data Set](DEd_create_copy_data.md)

[Deleting a Data Set](DEd_delete_data_set.md)

[Renaming a Data Set](DEd_rename_data_set.md)

[Making a Data Set the Default](DEd_make_dataset_default.md)

[Browsing a Data Set](DEd_browse_dataset.md)

[Exporting a Data Set](DEd_export_dataset.md)

[Showing the Differences Between Two Data Sets](DEd_show_difference_2datasets.md)

[Writing Array or Table Data to a File](DEd_write_array_tabledata.md)

[Reading the Data for an Array or a Table from a File](DEd_read_data_array_table.md)

[Working with the Global Elements Data Set](DEd_work_globalelement_dataset.md)

[Setting the Data Exchange Options](DEd_set_data_exchange_option.md)

[Using the Data Exchange Tool Set](DEd_use_data_exchange_toolset.md)
