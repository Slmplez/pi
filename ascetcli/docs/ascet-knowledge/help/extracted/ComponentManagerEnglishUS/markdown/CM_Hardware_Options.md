# Hardware Options

The Hardware and Hardware Connection nodes contain options required for a successful linking of ASCET models in INTECRIO for integration and rapid prototyping.

ASCET-RP adds further subnodes to the Hardware node. For the meaning of the subnode options, refer to the descriptions in the Options window and to the ASCET-RP user's guide.

For the meaning of the options in the Hardware node, refer to the descriptions in the Options window.

The Hardware Connection subnode contains the following options:

- Check HW connection before Build

Use this option to determine whether, upon starting an experiment (Open Experiment), the hardware search is performed before and after (activated, default) or only after the build process. If no suitable hardware is detected, an error message occurs.

When the option is activated, you can correct the error by adding a suitable hardware without losing the time for the build process.

When the option is deactivated, you can perform the build process without an error message, despite missing hardware.

- Use ETAS Network Manager (enables ’Select Hardware’)

Use this option to determine whether the ETAS Network Manager is used (activated, default) or not.

When the option is activated, the Select Hardware button and the Select Hardware option in the Tools menu of the project editor become available.

To work with the ES910 or RTPRO-PC, you must use the ETAS Network Manager.

- Skip HW selection if exactly one matching target instance found

Available only when you are using the ETAS Network Manager.

When this option is activated (default), the Experimental Target Hardware Selection window does not open when only one hardware, which matches the project, is found upon experiment start.

When this option is deactivated, the next option determines whether the Experimental Target Hardware Selection window opens each time you start an experiment. This window offers all experimental targets connected to your PC for selection.

- Skip HW selection if last used target instance found

Available only when you are using the ETAS Network Manager.

When this option is activated (default), Experimental Target Hardware Selection window does not open when only that hardware which was last used with the project is found upon experiment start.

When this option is deactivated, the previous option determines whether the Experimental Target Hardware Selection window opens each time you start an experiment.

- Edit Network Settings

This link opens the ETAS Network Manager.

- HW connection

Available only when you are not using the ETAS Network Manager.

In this combo box, you select whether the ES1000 and your PC are, by default, connected via the ES1120 control unit (Indirect (ES1120), default) or via the ES113x simulation computer (Direct (ES113x)).

- Try alternative HW connection

Available only when you are not using the ETAS Network Manager.

Use this option to determine whether a connection to both the device selected in the HW connection combo box and the other device (activated, default) or only to the selected device (deactivated) is to be searched.
