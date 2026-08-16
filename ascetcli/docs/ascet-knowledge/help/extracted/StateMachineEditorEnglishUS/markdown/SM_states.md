# States

A state describes one mode of an event-driven system. The activity or inactivity of the states change dynamically, based on trigger events and conditions.

Each state has a parent state. For states on the highest level, the state diagram itself is the parent. You can place states within other higher-level states [(Hierarchy)](SM_hierarchy.md). States containing no other states are called base states. A hierarchy state can have a history. History provides an efficient means of basing future activity on past activity.

The states are mutually exclusive, i.e. only one base state can be active at any one time. If the active base state is the substate of a hierarchy, all hierarchy states that contain the active state are active, too.

Each state has a unique name. The name can be freely selected, with two exceptions: reserved keywords are forbidden, and identical names are forbidden within different hierarchies. If you use an existing name a second time, _n is added to it. n is the smallest unissued number for this name.

The following names are forbidden, too:

- names of methods, processes, elements etc. in the entire project
- names from the C language (e.g., static, define, etc.)

Such state names do not always result in an error message, but the generated code is always wrong.

Besides the names, the states contain various actions (see [Actions](SM_actions.md)). These are processed successively according to their type. The following types exist: entry action, static action and exit action. All actions are optional.

See also

[Hierarchy](SM_hierarchy.md)

[Actions](SM_actions.md)

[History](SM_History.md)

[Reserved Keywords](introductionenglishus.chm::/INT_Reserved_Keywords.htm)
