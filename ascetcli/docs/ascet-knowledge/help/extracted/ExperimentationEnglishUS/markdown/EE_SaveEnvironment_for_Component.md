# Saving an Environment for Another Component

You can save the current environment for another component. However, this is reasonable only if both components have a similar structure (same labels, same methods/processes). In this case, ASCET maps the stored measurement and calibration windows by hierarchical label.

Proceed as follows.

1. In the File menu, select Save Environment for Component.
1. Select the component for which you want to save the environment.
1. Click OK.
1. Enter a name and a comment for the environment and click OK.

The experiment is stored under the name you entered. You can select it the next time you open the component.

Measurement and calibration windows or channels with elements that do not exist in the new component are deleted. In most cases you will only restore event generator settings, and, if present in both components, data generator settings and measurement/calibration windows for global elements.

See also

1. [Exporting Environments](export_environment.md)
1. [Saving an Environment](save_environment.md)
1. [Saving an Environment under a Different Name](save_environment_different_name.md)
1. (item)
