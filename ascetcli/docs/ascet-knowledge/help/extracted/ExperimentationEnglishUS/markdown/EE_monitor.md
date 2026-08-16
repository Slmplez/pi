shows the component used in the experiment

# Monitor

Monitors are a simple way of viewing numerical and logical values inside a block diagram. They can be particularly useful for keeping track of the way different values influence each other in complicated diagrams with many elements.

A monitor displays the current value of an element above the selected occurrence in the [experiment view](javascript:kadovTextPopup(this))<!-- kadovTextPopupInit('a1'); //-->.

You can monitor individual elements, or you can monitor all elements in the current experiment, or you can activate the automatic monitoring mode.

##### Automatic Monitoring Mode

When the automatic monitor mode is activated ([Activating Automatic Monitoring Mode](EE_Activate_AutomaticMonitorMode.md)), monitors are assigned to all elements currently visible in the experiment view. When you navigate in the graphical model (e.g., if you enter a graphical hierarchy or open an included component), new monitors are assigned when new elements become visible.

While the automatic monitoring mode is activated, you cannot assign monitors manually. The respective options are disabled.

Existing manual assignments of monitors ([Monitoring Elements Manually](monitor-element.md)) are not deleted; they remain part of the environment, and they are saved when you [save the environment](save_environment.md). When you deactivate automatic monitor mode, the manually assigned monitors are restored.

See also

[Monitoring Individual Elements](monitor-element.md)

[Activating Automatic Monitoring Mode](EE_Activate_AutomaticMonitorMode.md)
