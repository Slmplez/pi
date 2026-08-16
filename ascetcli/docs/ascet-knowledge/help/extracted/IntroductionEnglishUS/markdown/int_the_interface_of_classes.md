# The Interface of Classes

The interface of a class consists of a number of methods which are assigned to one of the diagrams of the class. The interface of each methods, consists of its arguments and a return value. Methods are similar to subroutines, that can be called from any point in the software. However, the data encapsulation of a class, i.e. the access to the same set of instance variables and parameters, makes the concept of methods and classes far more pervasive than that of subroutines. Methods have access to all the elements defined in their class.

The arguments and return value of a method can only be used in the body of the associated method. In addition, each method has a number of method-local variables. These variables are temporary and not static, and like arguments, they can only be used in the body of the associated method.

![](DIA0063.gif)

Additional methods can be made available for direct access to the instance variables of a class. This mechanism allows classes to be used as data containers (similar to records in C).

The interaction of a class with its environment consists of calling the methods of the class. When a method is called, the instructions in the method body are executed.

The methods of a class are categorized as either public or private by assigning them to a public or private diagram. Public methods can be called from any component, that uses that class. Private methods are hidden and can be called only by methods of the same class. They can used as internal subroutines.

See

[Overview - Component Interface](INT_Overview_ComponentInterface.md)

[The Interface of Modules](INT_The_Interface_of_Modules.md)
