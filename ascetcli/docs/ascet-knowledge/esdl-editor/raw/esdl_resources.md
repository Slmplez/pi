# Resources

Similar to messages, resources are available only in modules. They have two access methods, reserve and release. In ESDL, these methods can be used as shown in the following example:

resource1.reserve();

do_something();

resource1.release();

The table summarizes the public methods available for messages.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Returns | Usage |
| reserve () | void | reserve a resource |
| release () | void | release a resource |
