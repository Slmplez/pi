# Data

The data of a component describes how the elements of a component are to be initialized. Thus data refers to the elements of a component.

The data is held separately from the elements because a component can have multiple instances in a project, where the different instances access different data sets for their elements. (The data sets are, however, not parts of the respective instance.)

![](DIA0069.gif)

An example would be a p-control filter. Each instance of this p-control filter has its own value for the p-factor. This is achieved by assigning different data sets to the p-control.

The specification of data is part of the specification of the component itself, and not of the different instances. This may lead to a large number of different data sets for a component, but if each instance would hold its own data, this would result in the loss of a modular system design.

The organization of data for each element depends on whether it is a basic or complex element. Since basic elements are always used within complex objects, and are never considered separately from those, basic elements do not have explicit data sets. The data for the basic elements are therefore part of the data set of the complex element they are contained in.

Complex elements are the components specified by the user. Each complex element has its own data set. If a complex element is used in a component, the data set of the complex element is referenced by the component. Thus the data of a component has the same hierarchical structure as the component itself.

Data sets have an object ID, which is used to reference the data of a component. Just like references to user defined types, this reference is not name-based.

See also

[Example: Data](INT_Example__Data.md)
