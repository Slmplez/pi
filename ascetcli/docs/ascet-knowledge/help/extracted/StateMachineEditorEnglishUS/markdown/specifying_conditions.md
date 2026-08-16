# Specifying Conditions and Actions

Every state can have an entry, a static and an exit action, every transition can have a trigger, a condition and a transition action attached to it. [Conditions](SM_conditions.md) and [actions](SM_actions.md) are similar to methods, and they are specified the same way as the methods of classes.

A condition is tested each time the state machine is in a state that has a transition with this condition attached to it. If the condition is true, a transition takes place. Therefore a condition always has true or false as its return value. Entry, exit and transition actions - if present - are carried out each time a transition takes place, static actions are carried out when no transition takes place.

You can specify conditions and actions either in separate diagrams (ActionCondition diagrams) in the form of block diagrams or ESDL code. In that case, the state machine then contains at least two diagrams or as ESDL code. Alternatively, you can specify actions or conditions in ESDL directly in the state or transition editor; in this case no separate diagram is required.

Static actions of hierarchy states can be optimized regarding code size (see [Static Actions of Hierarchy States](Static_actions_of_hierarchy_states_1.md)).

See also

[Actions/Conditions in Separate Diagrams](SM_conditions_actions.md)

[Using Conditions and Actions](using_conditions_actions.md)

[Conditions and Actions in the State Diagram](conditions_actions_state.md)

[Communication with Other Components](communications_components.md)

[Static Actions of Hierarchy States](Static_actions_of_hierarchy_states_1.md)
