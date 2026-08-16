# Data

Data objects are used to store and process numerical values in the state diagram. The following types are available:

- Variables, parameters, constants
- Enumerations
- Arrays, matrices
- Literals
- Temporary variables
- Characteristic lines and maps
- Inputs for data from other ASCET components
- Outputs to other ASCET components
- other classes (e.g., timers, counters, comparators)

The state variable sm of type enum also belongs to the data. The variable is created in every state machine. This variable contains the currently active state. You cannot edit sm, but you can measure it in an experiment. If an ASAM-MCD-2CM file is generated for a project containing a state machine, the sm variable is also saved to the file.
