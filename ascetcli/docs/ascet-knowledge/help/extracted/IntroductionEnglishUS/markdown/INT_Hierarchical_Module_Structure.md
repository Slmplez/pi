# Hierarchical Module Structure

As mentioned before, modules are always instantiated in a project. That is, in a hierarchical module structure, a module used in another module is not instantiated within the containing module. As a consequence, all of the modules instantiated in a project are on the same level, independent of their position in the hierarchical structure.

The hierarchical structuring of modules serves mainly two purposes. A hierarchical structure reflects the nature of a control system. In an engine control, for instance, there may be separate modules for ignition, injection, and lambda control.

In addition, the communication structure in a hierarchical mode (see figure below) can be made much more transparent, since the dataflow is directly visible in block diagrams

![](DIA0066.gif)

A further advantage of a hierarchical module structure becomes clear by this example: easier maintenance. If, for instance, the name of a message is changed, it must be changed in all modules that use that message. If a hierarchical module is used instead, the changes only affect one module, since the name-based binding is not explicitly used.

See also

[Overview - Reusing Components](INT_Overview_ReusingComponents.md)

[Hierarchical Class Structure](INT_Hierarchical_Class_Structure.md)
