# Hardware Configuration Without ETAS Network Manager (ES1000 Only)

For special ES1000 use cases, you have the possibility to work without the ETAS Network Manager, in accordance with previous versions. The ethernet interface is set up for ASCET in the target.ini file of the target you are using. This file is located in the ..\target\ES1130 or ..\target\ES1135 directory.

Depending on your selection, a particular IP address variable from the respective target.ini file is used for the ASCET experiment environment.

- If the ASCET host PC is connected to the control unit (ES1120) of the ES1000.x, the following variable is used:
- ES1130

IndirectIpAddress=192.168.40.10

;Default IP-Address for ES1120.x

- ES1135

IndirectIpAddress=192.168.40.10

;Default IP-Address for ES1120.x

- If the ASCET host PC is connected to the computer node (ES1130) of the ES1000.x, the following variable is used:

- ES1130

DirectIpAddress=192.168.40.11

;Default IP-Address for ES1130.x

- ES1135

DirectIpAddress=192.168.40.15

;Default IP-Address for ES1135.1

See also

[Determining the ES1000 Connection](IIO_DetermineES1000Connection.md)
