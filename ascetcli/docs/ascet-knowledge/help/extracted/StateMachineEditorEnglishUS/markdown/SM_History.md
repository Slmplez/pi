# History

The history option provides the means to determine the destination substate of a transition to a hierarchy state based on past activities. If a hierarchy state has a history, the transition ends in the substate that was most recently active.

The history belongs to the hierarchy state in which the option was set. It takes priority over the start state within the hierarchy.

The generated code contains a special variable for the history, the history variable

See also

[Example: History](SM_Example__History.md)

[Hierarchy](SM_hierarchy.md)
