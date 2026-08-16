# Hierarchy States

State diagrams can be hierarchical (see [Hierarchy](SM_hierarchy.md)), i.e. a state can contain a different state diagram. When the state machine enters a hierarchy state, it starts with the start state of the subdiagram contained in the hierarchy state. If, however, the hierarchy has a history (see [History](SM_History.md)), the substate activated upon a transition to the hierarchy state is the one the subdiagram was in when the hierarchy state was last left.

A distinction is made between closed and open hierarchy states. Unlike a closed hierarchy state, where the subdiagram is created on a new drawing level, the subdiagram in an open hierarchy state is on the same drawing level. However, both hierarchy types have the same functionality. This means that when you are using open hierarchy states, there is not need to switch between different drawing levels.

Open and closed hierarchy states can exist within a state diagram simultaneously. However, a single state can only have one hierarchy type. Incorrect construction from overlapping states in the drawing area is displayed by a change of color on the state symbols.

It is possible to connect states that are not in the same hierarchy with pins on hierarchical state symbols. A connection between states via a pin is the same as if the states were connected directly.

Code for a hierarchical state machine can be generated either flat (a single switch statement for all (basis) states) or hierarchical (nested switch statements according to the hierarchy), the latter can considerably reduce the code size (see [Hierarchical Code Generation](SM_Hierarchical_Code_Generation.md)).

See also

[Hierarchy](SM_hierarchy.md)

[History](SM_History.md)

[Hierarchical Code Generation](SM_Hierarchical_Code_Generation.md)

[Adding a Closed Hierarchy State](SM_ClosedHierarchy.md)

[Moving Between Hierarchy Levels](SM_Move_between_hierarchies.md)

[Setting up a Hierarchy State with a History](SetupHierarchy.md)

[Adding a Pin to a Hierarchy State](addpin.md)

[Resolving a Hierarchy State](ResolveHirearchy.md)

[Adding an Open Hierarchy State](addopenhierarchy.md)
