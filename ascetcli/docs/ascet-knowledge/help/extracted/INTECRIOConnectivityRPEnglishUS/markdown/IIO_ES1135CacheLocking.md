# ES1135: Cache Locking

Depending on whether the respective functions are placed in the main memory or the cache of the ES1135, noticeable runtime differences can occur for short-period tasks. For highly time-critical applications, these differences can be intolerable.

As a remedy, ASCET provides the possibility to mark highly time-critical parts of the model and thus make sure that they are always available in the cache. This procedure is called cache locking. The second-level cache, or L2 cache, which is divided into four separate units (fourfold associative cache, 4-ways), is used for that purpose.

You can mark individual variables or parameters, as well as entire methods or processes (see [Cache Locking for Elements and Methods/Processes](IIO_CacheLocking_ElementMethodProcess.md)). Components can be marked, too; this mark is adopted by the elements of the component, if applicable (see [Cache Locking for a Component](IIO_CacheLocking_Component.md)). The mark is part of a particular implementation. In another implementation, the same object can have a different mark.

The following restrictions exist for cache locking:

- Up to 3 units of the L2 cache can be reserved for cache locking (cf. [Cache Locking for an Entire Project](IIO_CacheLocking_EntireProject.md)). At least one unit remains free for the unmarked parts of the model.

The associativity of the cache can make it impossible to keep all marked model parts permanently in the cache, even though cache space is available. This problem occurs rarely for code, but frequently for variables and parameters. It is thus recommended to mark code for cache locking.

- A cache unit cannot be further divided. If the model parts marked for cache locking occupy 2.5 units, the free half unit cannot be used otherwise.
- If parts of the cache are reserved for cache locking, less cache is available for the unmarked model parts. Runtime losses can occur.

Three settings are available for cache locking:

| Column 1 | Column 2 |
| --- | --- |
| Automatic | Variables, parameters, methods and processes adopt the setting of the parent component. This is the default setting. For components, Automatic is the same as Off . |
| On or Cache | Cache locking is switched on. |
| Off or Global | Cache locking is switched off. |

See also

[Cache Locking for Elements and Methods/Processes](IIO_CacheLocking_ElementMethodProcess.md)

[Cache Locking for a Component](IIO_CacheLocking_Component.md)

[Cache Locking for Complex Elements](IIO_CacheLocking_ComplexElement.md)

[Cache Locking in the OS Editor](IIO_CacheLocking_OSeditor.md)

[Cache Locking for an Entire Project](IIO_CacheLocking_EntireProject.md)
