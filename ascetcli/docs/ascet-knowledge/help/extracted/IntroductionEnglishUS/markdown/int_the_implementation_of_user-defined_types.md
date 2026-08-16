# The Implementation of User-Defined Types

The implementation of user-defined types consists of the implementations of all elements used in that component.

In the case of classes, the arguments and return values also need to have an implementation, since the value of an actual and formal argument have to be adjusted correctly to each other. This is automatically done for arguments of a scalar type.

This automatic adjustment does not work for arguments of composite or complex types. If such arguments are used, the implementation of the formal argument and the actual argument must coincide. Here, no automatic adjustment is possible, since these arguments are passed as references.

Temporary elements do not have an explicit implementation, but they are automatically assigned an implementation by the code generation algorithm. It is important that an assignment to this variable (e.g. an initialization) precedes any other use of it.

Method- and process-local elements can be implemented automatically, like temporary elements, but they can be explicitly implemented, too (see [Implementation of Method- and Process-Local Variables](ImplementationEditorEnglishUS.chm::/impl_method_process.htm)). The implementation is preserved within the method/process.
