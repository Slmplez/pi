# dependentParameters()Method

Within the dependentParameters method, equations are specified for parameters that depend on other parameters. This method is only executed if a parameter has been changed during the simulation experiment (asynchronous execution when changed). This reduces the calculation time.

For example: m_vehicle = m_empty + m_payload.

The vehicle mass is recalculated in the dependentParameters method only if the payload changes in the experiment.
