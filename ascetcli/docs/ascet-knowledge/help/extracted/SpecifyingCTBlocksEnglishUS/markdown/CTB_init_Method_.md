# init()Method

The init() method is called only at the beginning or restart of an experiment. The init() method can be used to specify code for initializing the block, e.g. to model the start-up behavior of a model or to initialize state variables (e.g. resetContinuousState(x,5.3)). Initialization values derived from calculation statements have to be explicitly assigned using the init() method.
