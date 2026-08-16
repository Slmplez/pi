# RTPRO-PC Experimental System

RTPRO-PC allows the real-time execution of prototyping models on an off-the shelf notebook. After installation of RTPRO-PC, the system can still be used as a standard Windows®-only computer, but it has got a second boot option to work as a combined Windows / prototyping (= real-time) computer.

On the Windows node of the combined mode, standard Windows applications can be used with slightly less performance than in Windows-only mode.

The real-time node is supported as standard ETAS experimental target with the following features:

- The RTPRO-PC target is configured and built in ASCET-MD V6.3 or higher, ASCET-RP V6.1.3 and higher or INTECRIO V4.1 and higher.
- Experiments can be performed using the ASCET experiment environment, the INTECRIO experiment environment, or INCA with INCA-EIP V7.0.1 and higher.
- An internal switch on the real-time node allows ECU access via RTPRO-PC from INCA.
- Up to four CAN interfaces (via two ES581.3) can be added. Each CAN interface supports either XCP on CAN or CAN I/O.
- One Ethernet controller is supported. This can be used for XCP bypass on UDP and XETK. The ethernet controller supports up to four XCP on UDP interfaces.

The two nodes communicate via a virtual network.

To use the RTPRO-PC experimental system with ASCET, you need a notebook with ASCET and RRTPRO-PC installations. RTPRO-PC is a separate product available at ETAS; please contact your local sales representative.

RTPRO-PC is available for the following notebooks:

- HP EliteBook 8540w with Intel® Core™ i7-7xx or -8xx processor and Mobile Intel® QM57 Express chipset
- HP EliteBook 8560w with Intel® Core™ i7-7xx, -8xx, -27xx, or -28xx processor and Mobile Intel® QM67 Express chipset
- HP EliteBook 8570w with Intel® Core™ i7-* or i5-* (3rd generation) quadcore processor (Intel® Hyper-Threading must be supported) and Mobile Intel® QM77 Express chipset
- Lenovo Thinkpad T530 (with Intel® Core™ i7-* or i5-* (3rd generation) dual-core processor (Intel® Hyper-Threading must be supported) and Mobile Intel QM77 Express chipset

In addition, you need an USB stick to serve as persistent memory and to store the license file and the NVRAM of the experimental system.

See also

[RTPRO-PC: Startup](IIO_RTPROPC_Startup.md)

[Configuring RTPRO-PC and ES581](IIO_ConfigureRTPROPC_ES581.md)
