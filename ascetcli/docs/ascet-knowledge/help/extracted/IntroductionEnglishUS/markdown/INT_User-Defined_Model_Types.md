# User-Defined Model Types

Elements can also be user-defined model types, i.e. modules or classes. User-defined model types are always reference types. The interface is defined by the interface of this component.

The scope of a user-defined type can be the same as that of the basic types, namely imported, exported, local and method-local. Like arguments, method/process-local elements of a reference type are not instantiated, but a reference to them is established. This means that, when using a method/process-local element of a reference type, an assignment to this element must precede any further use of that element.

The kind of an element is irrelevant for user-defined model types. User-defined model types are always treated as variables, i.e. there is no restriction of the interface from within the model.

See also

[The Scope of Elements](INT_the_scope_of_elements.md)
