# Using ESDL in State Machines

When modelling state machines in ASCET, the description in ESDL is often more compact than block diagrams. ESDL can be used to describe both states and transitions between states.

Typically, a state can have up to three different actions, which are labelled entry, static and exit. They are performed when the state is entered, while it is active, and when the state is terminated.

The actions in a state can be edited in the State Editor. They can be specified in ESDL if the <ESDL> option for the corresponding action is selected. This activates the text field for the action which is a simple ESDL editor. From this editor the output and input variables of the state machine and all other items in the Elements list of the state machine can be accessed.

A transition between states usually has a condition that triggers the transition to another state; it can have an action as well, which is executed when the transition is performed.

The transitions between states can be edited in the Transition Editor. Again, conditions and actions can be specified in the text field in ESDL after the <ESDL> option has been activated, and all items in the elements list can be accessed.

In all text fields of both editors, standard ESDL code is used. The one important point to remember in ESDL syntax is that the expression entered in the Condition tab returns a Boolean and is not terminated by a semicolon. You find more about editing actions and conditions in ESDL in [State Machines - Overview](../../state-machine-editor/raw/SM_overview.md) and references therein.

See also

[State Machines - Overview](../../state-machine-editor/raw/SM_overview.md)

[State Editor Window](../../state-machine-editor/raw/SM_State_Editor_Window.md)

[Transition Editor Window](../../state-machine-editor/raw/SM_Transition_Editor_Window.md)
