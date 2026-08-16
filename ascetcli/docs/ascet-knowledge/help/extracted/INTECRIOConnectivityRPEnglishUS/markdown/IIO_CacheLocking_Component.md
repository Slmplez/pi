# Cache Locking for a Component

To set up cache locking for a component, proceed as follows.

1. Open the implementation editor for the component.
1. Open the Settings tab.
1. In the Memory Segment combo box, select the desired setting.

| Column 1 | Column 2 |
| --- | --- |
| Automatic | The component inherits the setting of its parent component. This is the default setting. |
| Cache | Cache locking is switched on. |
| Global | Cache locking is switched off. |

The selected setting is adopted by the component's elements, methods and processes with the Automatic setting.

The setting is not recursive, i.e. it does not apply to the component's complex elements (= included components).

See also

[Cache Locking for Elements and Methods/Processes](IIO_CacheLocking_ElementMethodProcess.md)

[Cache Locking for Complex Elements](IIO_CacheLocking_ComplexElement.md)

[ES1135: Cache Locking](IIO_ES1135CacheLocking.md)
