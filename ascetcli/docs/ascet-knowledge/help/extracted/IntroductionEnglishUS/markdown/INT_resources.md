# Resources

A resource (type symbol ![](symboltyp_ressource.gif)) represents a part of an application that can only be used exclusively, e.g. timers or special devices. In order to access a resource, there are two methods:

- void reserve(): the resource is reserved, that is the access to it is blocked.
- void release(): the resource is released, that is access to it is granted again.

By executing the reserve method, access to the resource is blocked and exclusive access is guaranteed in a preemptive environment, i.e. if the current process is de-scheduled and another process wants to use the resource, the access is denied.

When access to the resource is no longer required, the resource can be released by the release method. This makes the resource accessible to other components again. To avoid deadlocks or priority inversions, the reservation of a resource is linked to the priority ceiling of the corresponding process. Resources are always global elements.

In the block diagram editor or software component editor, resources are represented by a block with the two methods reserve and release at the top.

![](asd0301a%20copy.gif)
