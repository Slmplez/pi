# Integration Methods With Variable Step Width

For experiments that need very precise calculation, the step width usually has to be reduced. This can increase the time used for calculation significantly. Models employing stiff differential equations often render the calculation using fixed-step integration methods infeasible. Adaptive integration methods are controlled by a target error margin. The step width is only reduced for those parts of the model where it is needed. Because the step width (and therefore the time needed for calculation) varies, these integration methods are not real-time capable.

If the desired precision cannot be reached due to the parameter settings, the experiment issues a warning in the ASCET monitor window. This happens when the maximum iteration depth is set too low or the minimal step width is set too high.
