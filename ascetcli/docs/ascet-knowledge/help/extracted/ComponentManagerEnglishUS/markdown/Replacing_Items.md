# Example: Replacing Items

Here is another example to clarify the way replacing an item works. It is the same example as in [Example: Replacing References](replacing_references.md), but this timethe IdleCon component is completely replaced, not just the references to it.

Before the Become Another Item command is executed, the ControllerTest project (and some other projects) references the IdleCon component. Another project Project references the IdleCon_new component.

![](gluewith_after1.gif)

The Become Another Item command is used to [replace](ReplaceReferences.md) the IdleCon component with IdleCon_new. After the command has been executed, the IdleCon component is deleted from the Component Manager. The 1 Database list now contains the components IdleCon_new and IdleCon_new_copy.

![](replace_after4.gif)

From the element view, it can be seen that ControllerTest now references IdleCon_new under the old name. IdleCon_new has the identifier from the replaced component IdleCon.

![](replace_after5.gif)

Show References reveals that all projects that originally referenced IdleCon now reference IdleCon_new.

![](gluewith_after2.gif)

The IdleCon_new_copy component contains the original instance of the replacing component and accordingly is referenced by the project Project.

![](gluewith_after4.gif)

![](gluewith_after3.gif)

See also

[Replacing a Database/Workspace Item](ReplaceDatabase.md)

[Example: Replacing References](replacing_references.md)
