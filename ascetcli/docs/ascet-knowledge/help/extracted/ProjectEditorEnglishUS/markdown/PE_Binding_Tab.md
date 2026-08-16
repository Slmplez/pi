# Binding Tab

This tab shows variable bindings. It contains the following elements.

- binding table

| Column 1 | Column 2 |
| --- | --- |
| Column name | content |
| Label | name of global variable or message |
| Imported by | name of the component (SWC, module, class) that imports the global element |
| Exported by | name of the component (project, SWC, module, class) that exports the global element |

- Unbound only option

If this option is activated, the table displays only those global elements that are exported only or imported only. The latter are called "unresolved globals", they will cause errors during code generation. See [Defining Global Elements in a Project](defineglobal.md) for a remedy.

See also

[Defining Global Elements in a Project](defineglobal.md)

[Viewing the Binding of Variables in a Project](viewbinding.md)

[Opening a Component from the Binding or Comm. Tab](opencomponent.md)
