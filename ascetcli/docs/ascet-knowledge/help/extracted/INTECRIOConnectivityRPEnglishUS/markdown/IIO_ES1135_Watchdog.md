# ES1135: Watchdog

To integrate a safety concept for the rapid prototyping system, the ES1135 offers a hardware watchdog function. The watchdog is an independent control unit that monitors the main ES1135 processor. For that purpose, a predefined data sequence is written periodically to a memory cell (watchdog service register). After a maximum time (watchdog period) without successful write access (watchdog service) to the watchdog service register, an exception handling (event) is triggered in the processor.

The ES1135 HW watchdog can be operated in two modes:

1. Safety-oriented mode (safety mode)
1. Flexible mode with more functions (Reduced Safety Mode Enhanced Function, RSEF Mode)

In the RSEF mode, the following watchdog settings can be re-configured at runtime:

- Event configuration

Defines the exception handling in case of watchdog expiration. The watchdog can also be disabled via event configuration.

- Watchdog period

Defines the time until the watchdog expires if no new watchdog service occurs.

- Switching modes

The safety mode is switched on with an arbitrary watchdog period and vent configuration. After that, this mode cannot be reconfigured or left. Therefore, the watchdog service should be set up in advance in a way that no undesired watchdog event occurs.

After the supply voltage is switched on, the watchdog is set to RSEF mode and switched off.

##### Watchdog Service

The Watchdog must be serviced before it expires. Otherwise, the selected watchdog event occurs. It is the task of the model designer to put the call of the service function at a place, where a malfunction of the model can be detected.

The Simulation Controller firmware provides an automatic watchdog servicing mechanism, which services the watchdog every 30 ms if interrupts are not disabled by the model. Thus, assumed that operating system is running correctly, the watchdog will be serviced regularly (if feature is enabled). This will be sufficient in many use cases.

##### Interrupt Control

For debug and supervision purposes in particular, it is possible to configure the watchdog to trigger a simulation processor interrupt on watchdog timer expiration.

The interrupt may either be polled or routed to the internal interrupt controller. A watchdog interrupt is latched and needs explicit acknowledging. Functions for fast disabling and enabling of the interrupt source are available. These functions only have effects on the interrupt propagation.

The watchdog interrupt is mapped to a HW Task inside ASCET. The watchdog handler is running below the ERCOSEK level but above other HW interrupts (e.g. from VME Bus), thus the watchdog interrupt is handled even if another HW interrupt is currently handled. Interrupt acknowledgement is done inside the ES1135 firmware, it should therefore not be done inside the handler task. The available set of ERCOSEK calls in the handler task is not restricted.

When a watchdog interrupt occurs, the watchdog is automatically restored from the overrun situation after 250 ms, restarting a new cycle with the previously selected period. This restoration time may be shortened, by performing a normal watchdog service with wdService().

A detailed description of the watchdog API is given in [API Functions - Watchdog](IIO_APIfunctionsWatchdog.md).
