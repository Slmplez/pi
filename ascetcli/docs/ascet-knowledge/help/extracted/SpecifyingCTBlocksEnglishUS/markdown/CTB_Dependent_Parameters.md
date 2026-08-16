# Dependent Parameters

![](button_depparam.gif)

If one parameter depends on another parameter, e.g. parameters described in different coordinate systems, it should be recalculated only if the other, affecting, parameter has changed. This type of parameter behavior can be described by dependent parameters. They are calculated only in case of changes asynchronously in the dependentParameters method.

For example: m_vehicle = m_empty + m_payload.

If the payload changes in the experiment, the vehicle mass is recalculated in the dependentParameters method.
