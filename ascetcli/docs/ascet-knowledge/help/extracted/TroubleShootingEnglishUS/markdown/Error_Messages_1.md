# Method Must Be Defined

Method <method_name> must be defined; need a return value

##### Description:

A method with return value has been declared in the component, but the return value does not have a sequence call attached to it. This is required, because the method might be called by other components.

##### Solution:

Edit the sequence call and select the method the return value belongs to as the sequence name. The sequence number must be the highest number attached to that method.
