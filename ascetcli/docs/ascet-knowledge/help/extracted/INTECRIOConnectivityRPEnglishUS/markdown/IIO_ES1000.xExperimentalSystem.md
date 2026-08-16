# ES1000.x Experimental System

All ES1000 system controller boards currently available are supported. The figure below shows the standard configurations; special configurations are of course possible.

![](Systemcontroller_ES1000.gif)

## Control Unit ES1120 and Simulation Computer ES1130/ES1135

If the ES1000.x is used for application and rapid prototyping simultaneously, the host PC is connected to the control unit ES1120 via ethernet cable. The functions developed with ASCET are loaded via the control unit ES1120 onto the ES1130 or ES1135, and then executed. Data can be measured and calibrated with ASCET while the experiment runs.

## TCP/IP Protocol Options

To avoid conflicts with a second network card that might be used for the LAN, the following TCP/IP settings should be selected.

| Column 1 | Column 2 |
| --- | --- |
| option | setting |
| DHCP service | disabled |
| IP address | 192.168.40.240 |
| subnet mask | 255.255.255.0 |
| DNS service | use local settings of your internal network |
| WINS service | disabled |
| IP Forwarding option | deactivated |
