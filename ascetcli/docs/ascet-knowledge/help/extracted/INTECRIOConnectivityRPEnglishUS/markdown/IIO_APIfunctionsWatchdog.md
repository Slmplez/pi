# API Functions - Watchdog

The ES1135 Simulation Controller has a hardware watchdog. The watchdog functionality is summarized in [ES1135: Watchdog](IIO_ES1135_Watchdog.md). The following interfaces are provided by the firmware:

##### Watchdog Configuration

- [wdSetSafetyMode](IIO_wdSetSafetyMode.md)
- [wdSetReducedSafetyMode](IIO_wdSetReducedSafetyMode.md)
- [wdSetPeriod](IIO_wdSetPeriod.md)
- [wdSetEvent](IIO_wdSetEvent.md)

##### Watchdog Service

- [wdService](IIO_wdService.md)
- [wdEnableAutoService](IIO_wdEnableAutoService.md)
- [wdDisableAutoService](IIO_wdDisableAutoService.md)

##### Interrupt Control

- [wdIntEnable](IIO_wdIntEnable.md)
- [wdIntDisable](IIO_wdIntDisable.md)
- [wdIntPend](IIO_wdIntPend.md)
- [wdIntAck](IIO_wdIntAck.md)

##### Watchdog Status

- [wdCheckReducedSafetyMode](IIO_wdCheckReducedSafetyMode.md)
- [wdCheckActive](IIO_wdCheckActive.md)
