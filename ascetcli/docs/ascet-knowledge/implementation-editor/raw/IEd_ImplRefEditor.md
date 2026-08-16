# Implementation Editor for Component References

The implementation editor for referenced components, i.e. the Impl Ref. Editor window, contains the following elements:

- Implementation of Instance combo box and ![](button_editimplementation.gif) button

Lists all available implementations of the referenced component. The button opens the implementation editor of the referenced component.

- Memory Location of Instance combo box

Used to select the memory area in which the instance of the referenced component is located. Possible values depend on the target selected in the associated project or default project and - in case of a referenced item - the internal access settings of the explicit reference.

- Memory Location of Reference combo box

Used to select the memory area in which the explicit reference is located. Possible values depend on the target selected in the associated project or default project.

- Memory Segment combo box

In a project context with an ASCET-SE target, this combo box is used to select a memory segment. See the ASCET-SE user's guide, chapter "Memory Segments", for more information.

In a project context with the ES1135 experimental target, this combo box is used to set up [cache locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm).

![](BUTTON.GIF) OK

Closes the window and accepts the changes.

![](BUTTON.GIF) Cancel

Closes the window without accepting the changes.

You can

[I](IED_ImplementingReferences.md)mplement References

See also

[ES1135: Cache Locking](INTECRIOConnectivityRPEnglishUS.chm::/IIO_ES1135CacheLocking.htm)
