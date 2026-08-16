# Merged CHM Content

## System Libraries

_Source: `markdown/SL_SystemLibrariesOverview.md`_

# System Libraries - Overview

ASCET provides the following libraries with predefined basic modeling blocks.

- [ASCET System Library](markdown/SL_ASCETSystemLibrary.md)
- [MBFS System Library](markdown/MBFS_SystemLibraryOverview.md)


---

## ASCET System Library

_Source: `markdown/SL_ASCETSystemLibrary.md`_

# ASCET System Library - Overview

The ASCET system library contains basic modeling blocks, grouped into the categories listed below. Two export files - ETAS_System_Library.exp and ETAS_System_Library.axl - are available in the export subdirectory of your ASCET installation directory.

After the import, the library blocks are provided in the ETAS_SystemLib folder and its subfolders.

- [Bit Operators](markdown/SL_BitOperators.md)
- [Comparators](markdown/SL_Comparators.md)
- [Counter & Timer](markdown/SL_CounterTimer.md)
- [Delay](markdown/SL_DelayBlocks.md)
- [Memory](markdown/SL_Memory.md)
- [Miscellaneous](markdown/SL_Miscellaneous.md)
- [Nonlinears](markdown/SL_Nonlinears.md)
- [Transfer Functions](markdown/SL_TransferFunction.md)
- [Control Blocks](markdown/SL_ControlBlocks.md)
- [Integrators](markdown/SL_Integrators.md)
- [Lowpass Blocks](markdown/SL_Lowpass.md)

The ETAS_IconLib folder and its subfolders (except those named *_MBFS) contain the block icons.


---

## Bit Operators

_Source: `markdown/SL_BitOperators.md`_

# ASCET System Library - Bit Operators

The ASCET system library contains the following bit operators:

- [And](markdown/And.md)
- [ClearBit](markdown/ClearBit.md)
- [GetBit](markdown/GetBit.md)
- [Or](markdown/Or.md)
- [Rotate](markdown/Rotate.md)
- [SetBit](markdown/SetBit.md)
- [ShiftLeft](markdown/ShiftLeft.md)
- [ShiftRight](markdown/ShiftRight.md)
- [ToggleBit](markdown/ToggleBit.md)
- [WriteBit](markdown/WriteBit.md)
- [WriteByte](markdown/WriteByte.md)
- [Xor](markdown/Xor.md)


---

## And

_Source: `markdown/And.md`_

# And

| Column 1 | Column 2 |
| --- | --- |
|  | and returns the binary AND conjunction of the two arguments. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| and | bitArray1 ::unsigned discrete | unsigned discrete |
|  | bitArray2 ::unsigned discrete |  |

On activation of method

And

The result of the binary AND conjunction of bitArray1 and bitArray2 is returned.


---

## ClearBit

_Source: `markdown/ClearBit.md`_

# ClearBit

| Column 1 | Column 2 |
| --- | --- |
|  | clearBit resets the bit at the specified position of the argument. The position of the LSB 1 is 0. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| clearBit | bitArray ::unsigned discrete | unsigned discrete |
|  | position ::unsigned discrete |  |

On activation of method

ClearBit

The argument bitArray is returned with a zero-bit at position position.


---

## GetBit

_Source: `markdown/GetBit.md`_

# GetBit

| Column 1 | Column 2 |
| --- | --- |
|  | getBit returns the value of the bit at the specified position of the argument as a logical value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| getBit | bitArray ::unsigned discrete | logical |
|  | position ::unsigned discrete |  |

On activation of method

GetBit

TRUE is returned, if the bit at position position is equal to 1, otherwise FALSE is returned.


---

## Or

_Source: `markdown/Or.md`_

# Or

| Column 1 | Column 2 |
| --- | --- |
|  | or returns the binary OR conjunction of the two arguments. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| or | bitArray1 ::unsigned discrete | unsigned discrete |
|  | bitArray2 ::unsigned discrete |  |

On activation of method

Or

The result of the binary OR conjunction of bitArray1 and bitArray2 is returned.


---

## Rotate

_Source: `markdown/Rotate.md`_

# Rotate

| Column 1 | Column 2 |
| --- | --- |
|  | rotate rotates the bits of the argument to the left by a specified number of positions. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| rotate | bitArray ::unsigned discrete | unsigned discrete |
|  | k ::unsigned discrete |  |

On activation of method

Rotate

The result of the left-rotation of bitArray1 by k positions is returned.


---

## SetBit

_Source: `markdown/SetBit.md`_

# SetBit

| Column 1 | Column 2 |
| --- | --- |
|  | setBit sets the bit at the specified position of the argument. The position of the LSB is 0 |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| setBit | bitArray ::unsigned discrete | unsigned discrete |
|  | position ::unsigned discrete |  |

On activation of method

SetBit

The argument bitArray is returned with a one-bit at position position.


---

## ShiftLeft

_Source: `markdown/ShiftLeft.md`_

# ShiftLeft

| Column 1 | Column 2 |
| --- | --- |
|  | shiftLeft shifts all bits of the argument to the left. The right bits are filled with zeros . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| shiftLeft | bitArray ::unsigned discrete | unsigned discrete |
|  | k ::unsigned discrete |  |

On activation of method

ShiftLeft

The result of the left-shift by k positions is returned. For k=1 the result corresponds to the multiplication by two.


---

## ShiftRight

_Source: `markdown/ShiftRight.md`_

# ShiftRight

| Column 1 | Column 2 |
| --- | --- |
|  | shiftRight shifts all bits of the argument to the right. The left bits are filled with zeros. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| shiftRight | bitArray ::unsigned discrete | unsigned discrete |
|  | k ::unsigned discrete |  |

On activation of method

ShiftRight

The result of the right-shift by k positions is returned.


---

## ToggleBit

_Source: `markdown/ToggleBit.md`_

# ToggleBit

| Column 1 | Column 2 |
| --- | --- |
|  | toggleBit inverts the bit at the specified position of the argument. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| toggleBit | bitArray ::unsigned discrete | unsigned discrete |
|  | position ::unsigned discrete |  |

On activation of method

ToggleBit

The argument bitArray is returned with the bit at position k toggled.


---

## WriteBit

_Source: `markdown/WriteBit.md`_

# WriteBit

| Column 1 | Column 2 |
| --- | --- |
|  | writeBit writes the value of the logical argument to the specified position of the unsigned discrete argument. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| writeBit | bitArray ::unsigned discrete | unsigned discrete |
|  | aBool ::logical |  |
|  | position ::unsigned discrete |  |

On activation of method

WriteBit

For aBool = FALSE the argument is returned with a zero-bit at position position , for aBool = TRUE the argument is returned with a one-bit at position position.


---

## WriteByte

_Source: `markdown/WriteByte.md`_

# WriteByte

| Column 1 | Column 2 |
| --- | --- |
|  | writeByte writes the values of eight logical inputs to the eight least significant bits of the argument. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| writeByte | bitArray ::unsigned discrete | unsigned discrete |
|  | b0 ::logical |  |
|  | b1 ::logical |  |
|  | b2 ::logical |  |
|  | b3 ::logical |  |
|  | b4 ::logical |  |
|  | b5 ::logical |  |
|  | b6 ::logical |  |
|  | b7 ::logical |  |

On activation of method

WriteByte

The argument is returned with the values of b0 to b7 written to the bit positions 0 to 7. 0 is the position of the LSB and the logical values TRUE and FALSE are mapped to 1 and 0 respectively.


---

## Xor

_Source: `markdown/Xor.md`_

# Xor

| Column 1 | Column 2 |
| --- | --- |
|  | xor returns the binary exclusive OR conjunction of the two arguments. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| xor | bitArray1 ::unsigned discrete | unsigned discrete |
|  | bitArray2 ::unsigned discrete |  |

On activation of method

XOR

The result of the binary exclusive OR conjunction of bitArray1 and bitArray2 is returned.


---

## Comparators

_Source: `markdown/SL_Comparators.md`_

# ASCET System Library - Comparators

The ASCET system library contains the following comparators:

- [ClosedInterval](markdown/ClosedInterval.md)
- [LeftOpenInterval](markdown/LeftOpenInterval.md)
- [OpenInterval](markdown/OpenInterval.md)
- [RightOpenInterval](markdown/RightOpenInterval.md)
- [GreaterZero](markdown/GreaterZero.md)


---

## ClosedInterval

_Source: `markdown/ClosedInterval.md`_

# ClosedInterval

| Column 1 | Column 2 |
| --- | --- |
|  | ClosedInterval returns TRUE if the value x is in the closed interval defined by A and B . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | logical |
|  | A ::continuous |  |
|  | B ::continuous |  |

On activation of method

Out

TRUE is returned, if A <= x <= B. Otherwise FALSE is returned.


---

## LeftOpenInterval

_Source: `markdown/LeftOpenInterval.md`_

# LeftOpenInterval

| Column 1 | Column 2 |
| --- | --- |
|  | LeftOpenInterval returns TRUE if the value x is in the left open interval defined by A and B . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | logical |
|  | A ::continuous |  |
|  | B ::continuous |  |

On activation of method

Out

TRUE is returned, if A < x <= B. Otherwise FALSE is returned.


---

## OpenInterval

_Source: `markdown/OpenInterval.md`_

# OpenInterval

| Column 1 | Column 2 |
| --- | --- |
|  | OpenInterval returns TRUE if the value x is in the open interval defined by A and B . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | logical |
|  | A ::continuous |  |
|  | B ::continuous |  |

On activation of method

Out

TRUE is returned, if A < x < B. Otherwise FALSE is returned.


---

## RightOpenInterval

_Source: `markdown/RightOpenInterval.md`_

# RightOpenInterval

| Column 1 | Column 2 |
| --- | --- |
|  | RightOpenInterval returns TRUE if the value x is in the right open interval defined by A and B . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | logical |
|  | A ::continuous |  |
|  | B ::continuous |  |

On activation of method

Out

TRUE is returned, if A <= x < B. Otherwise FALSE is returned.


---

## GreaterZero

_Source: `markdown/GreaterZero.md`_

# GreaterZero

| Column 1 | Column 2 |
| --- | --- |
|  | GreaterZero returns TRUE if the value x is greater than zero. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > 0.0. Otherwise FALSE is returned.


---

## Counter & Timer

_Source: `markdown/SL_CounterTimer.md`_

# ASCET System Library - Counter & Timer

The ASCET system library contains the following counter and timer blocks:

- [CountDown](markdown/CountDown.md)
- [CountDownEnabled](markdown/CountDownEnabled.md)
- [Counter](markdown/Counter.md)
- [CounterEnabled](markdown/CounterEnabled.md)
- [StopWatch](markdown/StopWatch.md)
- [StopWatchEnabled](markdown/StopWatchEnabled.md)
- [Timer](markdown/Timer.md)
- [TimerEnabled](markdown/TimerEnabled.md)
- [TimerRetrigger](markdown/TimerRetrigger.md)
- [TimerRetriggerEnabled](markdown/TimerRetriggerEnabled.md)


---

## CountDown

_Source: `markdown/CountDown.md`_

# CountDown

| Column 1 | Column 2 |
| --- | --- |
|  | CountDown decrements the counter and signals when the counter has reached zero. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startValue ::unsigned discrete | none |
| compute | none | none |
| out | none | logical |

On activation of method

Start

The counter is set to the start value.

Compute

The counter is decremented by one.

Out

TRUE is returned if the counter is greater than zero. Otherwise, FALSE is returned.


---

## CountDownEnabled

_Source: `markdown/CountDownEnabled.md`_

# CountDownEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownEnabled decrements the counter and signals when the counter has reached zero. This counter must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startValue ::unsigned discrete | none |
| compute | enable ::logical | none |
| out | none | logical |

On activation of method

Start

The counter is set to the start value.

Compute

If enable is TRUE, the counter is decrement by one.

Out

TRUE is returned if the counter is greater than zero. Otherwise, FALSE is returned.


---

## Counter

_Source: `markdown/Counter.md`_

# Counter

| Column 1 | Column 2 |
| --- | --- |
|  | Counter increments the counter by one. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | none | none |
| compute | none | none |
| out | none | unsigned discrete |

On activation of method

Reset

The counter is set to zero.

Compute

The counter is increment by one.

Out

The counter value is returned.


---

## CounterEnabled

_Source: `markdown/CounterEnabled.md`_

# CounterEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | Counter increments the counter by one. This counter must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical | none |
| compute | enable ::logical | none |
| out | none | unsigned discrete |

On activation of method

Reset

If initEnable is TRUE, the counter is set to zero.

Compute

If enable is TRUE, the counter is incremented by one.

Out

The counter value is returned.


---

## StopWatch

_Source: `markdown/StopWatch.md`_

# StopWatch

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatch increments the time counter by one dT. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | none | none |
| compute | none | none |
| out | none | continuous |

On activation of method

Reset

The time counter is set to zero.

Compute

The time counter is increment by dT.

Out

The time counter value, i.e. the time elapsed since the last start, is returned.


---

## StopWatchEnabled

_Source: `markdown/StopWatchEnabled.md`_

# StopWatchEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchEnabled increments the time counter by one dT. This timer must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical | none |
| compute | enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the time internal counter is set to zero.

Compute

If enable is TRUE, the time counter is increment by dT.

out

The time counter value, i.e. the time elapsed since the last start and while enabled was TRUE is returned.


---

## Timer

_Source: `markdown/Timer.md`_

# Timer

| Column 1 | Column 2 |
| --- | --- |
|  | Timer decrements the time counter by dT and signals when the time counter has reached zero. It is not retriggerable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startTime ::continuous | none |
| compute | none | none |
| out | none | logical |

On activation of method

Start

The time counter is set to startTime if the time counter value was previously less than or equal to zero.

Compute

The time counter is decremented by dT.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.


---

## TimerEnabled

_Source: `markdown/TimerEnabled.md`_

# TimerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerEnabled decrements the time counter by dT and signals when the time counter has reached zero. It is must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| Compute | enable ::logical in ::logical startTime ::continuous | none |
| Out | none | logical |

On activation of method

Compute

If enable is TRUE, in has a rising edge and the time counter value is less or equal to zero, the timer is started,i.e. its counter value is set to the start time. Otherwise, the time counter is decremented by dT. If enable is FALSE, nothing happens.

Out

TRUE is returned, if the time counter is greater than zero. Otherwise, FALSE is returned.


---

## TimerRetrigger

_Source: `markdown/TimerRetrigger.md`_

# TimerRetrigger

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetrigger decrements the time counter by dT and signals when the time counter has reached zero. It can be retriggered |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| start | startTime ::continuous | none |
| compute | none | none |
| out | none | logical |

On activation of method

Start

The time counter is set to the start value.

Compute

The time counter is decremented by dT.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.


---

## TimerRetriggerEnabled

_Source: `markdown/TimerRetriggerEnabled.md`_

# TimerRetriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerEnabled decrements the time counter by dT and signals when the time counter has reached zero. It can be retriggered and must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | enable ::logical in ::logical startValue ::continuous | none |
| out | none | logical |

On activation of method

Compute

If enable is TRUE and in has a rising edge, the timer is started, i.e. its counter value is set to the start value. Otherwise, the time counter is decremented by dT (the time frame). If enable is FALSE, nothing happens.

Out

TRUE is returned, if the time counter value is greater than zero. Otherwise, FALSE is returned.


---

## Delay

_Source: `markdown/SL_DelayBlocks.md`_

# ASCET System Library - Delay

The ASCET system library contains the following delay blocks:

- [DelaySignal](markdown/DelaySignal.md)
- [DelaySignalEnabled](markdown/DelaySignalEnabled.md)
- [DelayValue](markdown/DelayValue.md)
- [DelayValueEnabled](markdown/DelayValueEnabled.md)
- [TurnOffDelay](markdown/TurnOffDelay.md)
- [TurnOffDelayVariable](markdown/TurnOffDelayVariable.md)
- [TurnOnDelay](markdown/TurnOnDelay.md)
- [TurnOnDelayVariable](markdown/TurnOnDelayVariable.md)


---

## DelaySignal

_Source: `markdown/DelaySignal.md`_

# DelaySignal

| Column 1 | Column 2 |
| --- | --- |
|  | DelaySignal delays its input signal by one evaluation step . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is buffered.

Out

The buffered signal is returned, thus the input signal is delayed by one step.


---

## DelaySignalEnabled

_Source: `markdown/DelaySignalEnabled.md`_

# DelaySignalEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DelaySignalEnabled delays its input signal by one evaluation step. It must be enabled explicitly . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical initValue ::logical | none |
| compute | signal ::logical enable ::logical | none |
| out | none | logical |

On activation of method

Reset

If initEnable is TRUE, initValue is buffered.

Compute

If enable is TRUE, the input signal is buffered.

Out

The buffered signal is returned, thus the input signal is delayed by one step.


---

## DelayValue

_Source: `markdown/DelayValue.md`_

# DelayValue

| Column 1 | Column 2 |
| --- | --- |
|  | DelayValue delays its input value by one evaluation step. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | value ::continuous | none |
| out | none | continuous |

On activation of method

Compute

The input value is buffered.

Out

The buffered value is returned, thus the input value is delayed by one step.


---

## DelayValueEnabled

_Source: `markdown/DelayValueEnabled.md`_

# DelayValueEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DelayValueEnabled delays its input value by one evaluation step. It must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initEnable ::logical initValue ::continuous | none |
| compute | value ::continuous enable ::logical | none |
| out | none | logical |

On activation of method

Reset

If initEnable is TRUE, initValue is buffered.

Compute

If enable is TRUE, the input value is buffered.

Out

The buffered value is returned, thus the input value is delayed by one step.


---

## TurnOffDelay

_Source: `markdown/TurnOffDelay.md`_

# TurnOffDelay

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelay delays a falling edge of the input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A falling edge of the input signal is delayed. If the signal flips from TRUE to FALSE, a timer is started. On being FALSE the timer is incremented by dT and is compared to delayTime. If the input signal is TRUE, the timer is reset.

Out

TRUE is returned if the input signal is TRUE or the timer has not exceeded delayTime. Otherwise, FALSE is returned.


---

## TurnOffDelayVariable

_Source: `markdown/TurnOffDelayVariable.md`_

# TurnOffDelayVariable

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelay delays a falling edge of the input signal. The duration of the delay can be modified at runtime via the Time variable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A falling edge of the input signal is delayed. If the signal flips from TRUE to FALSE, a timer is started. On being FALSE the timer is incremented by dT and is compared to delayTime. If the input signal is TRUE, the timer is reset.

Out

TRUE is returned if the input signal is TRUE or the timer has not exceeded delayTime. Otherwise, FALSE is returned.


---

## TurnOnDelay

_Source: `markdown/TurnOnDelay.md`_

# TurnOnDelay

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelay delays a rising edge of the input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A rising edge of the input signal is delayed. If the signal flips from FALSE to TRUE, a timer is started. On being TRUE the timer is incremented by dT and is compared to delayTime. If the input signal is FALSE, the timer is reset.

Out

FALSE is returned if the input signal is FALSE, or the timer has not exceeded delayTime. Otherwise, TRUE is returned.


---

## TurnOnDelayVariable

_Source: `markdown/TurnOnDelayVariable.md`_

# TurnOnDelayVariable

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelayVariable delays a rising edge of the input signal. The duration of the delay can be modified at runtime via the Time variable. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical delayTime ::continuous | none |
| out | none | logical |

On activation of method

Compute

A rising edge of the input signal is delayed. If the signal flips from FALSE to TRUE, a timer is started. On being TRUE the timer is incremented by dT and is compared to delayTime. If the input signal is FALSE, the timer is reset.

Out

FALSE is returned if the input signal is FALSE, or the timer has not exceeded delayTime. Otherwise, TRUE is returned.


---

## Memory

_Source: `markdown/SL_Memory.md`_

# ASCET System Library - Memory

The ASCET system library contains the following memory blocks:

- [Accumulator](markdown/Accumulator.md)
- [AccumulatorEnabled](markdown/AccumulatorEnabled.md)
- [AccumulatorLimited](markdown/AccumulatorLimited.md)
- [RSFlipFlop](markdown/RSFlipFlop.md)


---

## Accumulator

_Source: `markdown/Accumulator.md`_

# Accumulator

| Column 1 | Column 2 |
| --- | --- |
|  | Accumulator adds up its input value . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | value ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The accumulator value is set to initValue.

Compute

The accumulator is incremented by the input value, i.e.accumulator (new) = accumulator (old) + input value.

Out

The accumulator value is returned.


---

## AccumulatorEnabled

_Source: `markdown/AccumulatorEnabled.md`_

# AccumulatorEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorEnabled adds up its input value. It must be enabled explicitly and its accumulator value can be limited |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | value ::continuous mn ::continuous mx ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the accumulator value is set to initValue.

Compute

If enable is TRUE, the accumulator is incremented by the input value, i.e. accumulator(new) = accumulator(old) + input value. Additionally, the accumulator value is limited by mn and mx.

Out

The accumulator value is returned.


---

## AccumulatorLimited

_Source: `markdown/AccumulatorLimited.md`_

# AccumulatorLimited

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorLimited adds up its input value. Its accumulator value can be limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | value ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The accumulator value is set to initValue.

Compute

The accumulator is incremented by the input value, i.e. accumulator(new) = accumulator(old) + input value. Additionally, the accumulator value is limited by mn and mx.

Out

The accumulator value is returned.


---

## RSFlipFlop

_Source: `markdown/RSFlipFlop.md`_

# RSFlipFlop

| Column 1 | Column 2 |
| --- | --- |
|  | RSFlipFlop is a flip flop with a reset and a set input, where the reset input dominates the set input. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | r ::logical s ::logical | none |
| q | none | logical |
| nq | none | logical |

On activation of method

Compute

If r is TRUE, the state of the flip flop is set to FALSE. Otherwise, if s is TRUE, the state is set to TRUE. If both r and s are FALSE, the state is left unchanged.

Q

The state of the flip flop is returned.

NQ

The negated value of the state is returned.


---

## Miscellaneous

_Source: `markdown/SL_Miscellaneous.md`_

# ASCET System Library - Miscellaneous

The ASCET system library contains the following miscellaneous blocks:

- [DeltaOneStep](markdown/DeltaOneStep.md)
- [DifferenceQuotient](markdown/DifferenceQuotient.md)
- [EdgeBi](markdown/EdgeBi.md)
- [EdgeFalling](markdown/EdgeFalling.md)
- [EdgeRising](markdown/EdgeRising.md)
- [Mux1of4](markdown/Mux1of4.md)
- [Mux1of8](markdown/Mux1of8.md)


---

## DeltaOneStep

_Source: `markdown/DeltaOneStep.md`_

# DeltaOneStep

| Column 1 | Column 2 |
| --- | --- |
|  | DeltaOneStep returns the difference of the current input value and the last input value . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | value ::continuous | none |
| out | none | continuous |

On activation of method

Compute

The previous input value is subtracted from the input value.

Out

The difference is returned.


---

## DifferenceQuotient

_Source: `markdown/DifferenceQuotient.md`_

# DifferenceQuotient

| Column 1 | Column 2 |
| --- | --- |
|  | DifferenceQuotient computes the difference quotient of the input value . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | value ::continuous | none |
| out | none | continuous |

On activation of method

Compute

The difference quotient (value - previous value)/dT is computed.

Out

The difference quotient is returned.


---

## EdgeBi

_Source: `markdown/EdgeBi.md`_

# EdgeBi

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeBi detects a bidirectional edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal and the previous input signal differ. Otherwise, FALSE is returned.


---

## EdgeFalling

_Source: `markdown/EdgeFalling.md`_

# EdgeFalling

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeFalling detects a falling edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal is low and the previous input signal was high. Otherwise, FALSE is returned.


---

## EdgeRising

_Source: `markdown/EdgeRising.md`_

# EdgeRising

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeRising detects a rising edge of the logical input signal. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | signal ::logical | none |
| out | none | logical |

On activation of method

Compute

The input signal is compared to the previous input signal.

Out

TRUE is returned, if the input signal is high and the previous input signal was low. Otherwise, FALSE is returned.


---

## Mux1of4

_Source: `markdown/Mux1of4.md`_

# Mux1of4

| Column 1 | Column 2 |
| --- | --- |
|  | Mux1of4 switches between the four inputs values s0,...,s3 on the binary representation of their index. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | b0 ::logical b1 ::logical s0 ::continuous s1 ::continuous s2 ::continuous s3 ::continuous | continuous |

On activation of method

Out

The input value si (index i) is returned with i = b0 + 2*b1, interpreting FALSE as 0 and TRUE as 1.


---

## Mux1of8

_Source: `markdown/Mux1of8.md`_

# Mux1of8

| Column 1 | Column 2 |
| --- | --- |
|  | Mux1of8 switches between the eight inputs values s0,...,s7 on the binary representation of their index . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | b0 ::logical b1 ::logical b2 ::logical s0 ::continuous s1 ::continuous s2 ::continuous s3 ::continuous s4 ::continuous s5 ::continuous s6 ::continuous s7 ::continuous | continuous |

On activation of method

Out

The input value si(index i) is returned with i = b0 + 2*b1+ 4*b2, interpreting FALSE as 0 and TRUE as 1.


---

## Nonlinears

_Source: `markdown/SL_Nonlinears.md`_

# ASCET System Library - Nonlinears

The ASCET system library contains the following nonlinear blocks:

- [Hysteresis-Delta-RSP](markdown/Hysteresis_Delta_RSP.md)
- [Hysteresis-LSP-Delta](markdown/Hysteresis_LSP_Delta.md)
- [Hysteresis-LSP-RSP](markdown/Hysteresis_LSP_RSP.md)
- [Hysteresis-MSP-DeltaHalf](markdown/Hysteresis_MSP_DeltaHalf.md)
- [Limiter](markdown/Limiter.md)
- [Signum](markdown/Signum.md)


---

## Hysteresis-Delta-RSP

_Source: `markdown/Hysteresis_Delta_RSP.md`_

# Hysteresis-Delta-RSP

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-Delta-RSP is a hysteresis with a right switching point and a delta offset |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous delta ::continuous rsp ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > rsp. FALSE is returned, if x < (rsp - delta). The return value is unchanged, if x lies within the open interval ](rsp - delta), rsp[.


---

## Hysteresis-LSP-Delta

_Source: `markdown/Hysteresis_LSP_Delta.md`_

# Hysteresis-LSP-Delta

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-LSP-Delta is a hysteresis with a left switching point and a delta offset |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous lsp ::continuous delta ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > (lsp + delta). FALSE is returned, if x < lsp. The return value is unchanged, if x lies within the open interval ]lsp, (lsp + delta)[.


---

## Hysteresis-LSP-RSP

_Source: `markdown/Hysteresis_LSP_RSP.md`_

# Hysteresis-LSP-RSP

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-LSP-RSP is a hysteresis with both a left and a right switching point |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous lsp ::continuous rsp ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > rsp. FALSE is returned, if x < lsp. The return value is unchanged, if x lies within the open interval ]lsp, rsp[.


---

## Hysteresis-MSP-DeltaHalf

_Source: `markdown/Hysteresis_MSP_DeltaHalf.md`_

# Hysteresis-MSP-DeltaHalf

| Column 1 | Column 2 |
| --- | --- |
|  | Hysteresis-MSP-DeltaHalf is a hysteresis with a middle switching point and a delta/2 offset. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous msp ::continuous deltahalf ::continuous | logical |

On activation of method

Out

TRUE is returned, if x > (msp + deltahalf). FALSE is returned, if x < (msp - deltahalf). The return value is unchanged, if input x is in the open interval ](msp - deltahalf), (msp + deltahalf)[.


---

## Limiter

_Source: `markdown/Limiter.md`_

# Limiter

| Column 1 | Column 2 |
| --- | --- |
|  | Limiter returns the input x limited by mn and mx . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous mn ::continuous mx ::continuous | continuous |

On activation of method

Out

The input x is limited by mn and mx and is returned, i.emax(min(x, mx), mn). There is no check if mn <= mx.


---

## Signum

_Source: `markdown/Signum.md`_

# Signum

| Column 1 | Column 2 |
| --- | --- |
|  | Signum returns the sign of the input . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | x ::continuous | continuous |

On activation of method

Out

1.0 is returned if x > 0.0, 0.0 is returned if x = 0.0, and -1.0 is returned if x < 0.0.


---

## Transfer Functions

_Source: `markdown/SL_TransferFunction.md`_

# ASCET System Library - Transfer Functions

The ASCET system library contains the following transfer function groups:

- [Control Blocks](markdown/SL_ControlBlocks.md)
- [Integrators](markdown/SL_Integrators.md)
- [Lowpass Blocks](markdown/SL_Lowpass.md)


---

## Control

_Source: `markdown/SL_ControlBlocks.md`_

# ASCET System Library - Control Blocks

The ASCET system library contains the following control blocks:

- [DT1](markdown/dT1.md)
- [P](markdown/P.md)
- [PI](markdown/PI.md)
- [PID](markdown/PID.md)
- [PIDLimited](markdown/PIDLimited.md)
- [PILimited](markdown/PILimited.md)
- [PT1](markdown/PT1.md)
- [PT2](markdown/PT2.md)


---

## DT1

_Source: `markdown/dT1.md`_

# DT1

| Column 1 | Column 2 |
| --- | --- |
|  | dT1 is a time discrete differentiation transfer function with time constant T and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The differentiation value is set to initValue.

Compute

The differentiation value is computed via a P-function and an I-function which is backcoupled.

Out

The differentiation value is returned.


---

## P

_Source: `markdown/P.md`_

# P

| Column 1 | Column 2 |
| --- | --- |
|  | P is a time discrete proportional transfer function with gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| out | in ::continuous | continuous |
|  | K ::continuous |  |

On activation of method

Out

The return value out = in * K is computed.


---

## PI

_Source: `markdown/PI.md`_

# PI

| Column 1 | Column 2 |
| --- | --- |
|  | PI is a time discrete proportional integrator with time constant T and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PI-function is computed as the sum of a P-function and an I-function.

Out

The value of the PI-function is returned.


---

## PID

_Source: `markdown/PID.md`_

# PID

| Column 1 | Column 2 |
| --- | --- |
|  | PID is a time discrete proportional integrator with differential part with time constants Tv and Tn and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous Tv ::continuous Tn ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PID-function is computed as a sum of a P-function, a D-function and an I-function.

Out

The value of the PID-function is returned.


---

## PIDLimited

_Source: `markdown/PIDLimited.md`_

# PIDLimited

| Column 1 | Column 2 |
| --- | --- |
|  | PIDLimited is a time discrete proportional integrator with differential part with time constants Tv and Tn and gain constant K. The value of the integrator is limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous Tv ::continuous Tn ::continuous K ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PID-function is computed as a sum of a P-function, a D-function and an I-function, where the integrator value of the I-function is limited by mn and mx.

Out

The value of the PID-function is returned.


---

## PILimited

_Source: `markdown/PILimited.md`_

# PILimited

| Column 1 | Column 2 |
| --- | --- |
|  | PILimited is a time discrete proportional integrator with time constant T and gain constant K. The value of the integrator is limited |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The value of the PI-function is computed as the sum of a P-function and an I-function, where the integrator value of the I-function is limited by mn and mx.

Out

The value of the PI-function is returned.


---

## PT1

_Source: `markdown/PT1.md`_

# PT1

| Column 1 | Column 2 |
| --- | --- |
|  | PT1 is a time discrete low pass with time constant T and gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The value of the integrator is set to initValue.

Compute

The value of the PT1-function is computed via an I-function and a P-function which is backcoupled.

Out

The value of the PT1-function is returned.


---

## PT2

_Source: `markdown/PT2.md`_

# PT2

| Column 1 | Column 2 |
| --- | --- |
|  | PT2 is a time discrete delay function with time constant T, gain constant K, and damping d |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous K ::continuous d ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The two integrator values are set to initValue.

Compute

The value of the PT2-function is computed via two I-functions in row, which are backcoupled by a cascade of two P-functions.

Out

The value of the PT2-function is returned.


---

## Integrators

_Source: `markdown/SL_Integrators.md`_

# ASCET System Library - Integrators

The ASCET system library contains the following integrators:

- [IntegratorK](markdown/IntegratorK.md)
- [IntegratorKEnabled](markdown/IntegratorKEnabled.md)
- [IntegratorKLimited](markdown/IntegratorKLimited.md)
- [IntegratorT](markdown/IntegratorT.md)
- [IntegratorTEnabled](markdown/IntegratorTEnabled.md)
- [IntegratorTLimited](markdown/IntegratorTLimited.md)


---

## IntegratorK

_Source: `markdown/IntegratorK.md`_

# IntegratorK

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorK is a time discrete integrator with gain constant K. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator (new) = integrator (old) + in * dT*K.

Out

The integrator value is returned.


---

## IntegratorKEnabled

_Source: `markdown/IntegratorKEnabled.md`_

# IntegratorKEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorKEnabled is a time discrete integrator with gain constant K. It must be enabled explicitly and its integrator value can be limited . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous K ::continuous mn ::continuous mx ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the integrator value is set to initValue.

Compute

If enable is TRUE, the integrator value is computed via integrator(new) = integrator(old) + in * dT * K (limited by mn and mx).

Out

The integrator value is returned.


---

## IntegratorKLimited

_Source: `markdown/IntegratorKLimited.md`_

# IntegratorKLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorKLimited is a time discrete integrator with gain constant K. Its integrator value can be limited . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous K ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator (new) = integrator (old) + in * dT * K (limited by mn and mx).

Out

The integrator value is returned.


---

## IntegratorT

_Source: `markdown/IntegratorT.md`_

# IntegratorT

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorT is a time discrete integrator with time constant T. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator(new) = integrator(old) + in * dT / T.

Out

The integrator value is returned.


---

## IntegratorTEnabled

_Source: `markdown/IntegratorTEnabled.md`_

# IntegratorTEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTEnabled is a time discrete integrator with time constant T. It must be enabled explicitly and its integrator value can be limited. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous T ::continuous mn ::continuous mx ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the integrator value is set to initValue.

Compute

If enable is TRUE, the integrator value is computed via integrator(new) = integrator(old) + in * dT / T (limited by mn and mx).

Out

The integrator value is returned.


---

## IntegratorTLimited

_Source: `markdown/IntegratorTLimited.md`_

# IntegratorTLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTLimited is a time discrete integrator with time constant T. Its integrator value can be limited . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous mn ::continuous mx ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The integrator value is set to initValue.

Compute

The integrator value is computed via integrator(new) = integrator(old) + in * dT / T (limited by mn and mx).

Out

The integrator value is returned.


---

## Lowpass

_Source: `markdown/SL_Lowpass.md`_

# ASCET System Library - Lowpass

The ASCET system library contains the following lowpass blocks:

- [DigitalLowpass](markdown/DigitalLowpass.md)
- [LowpassK](markdown/LowpassK.md)
- [LowpassKEnabled](markdown/LowpassKEnabled.md)
- [LowpassT](markdown/LowpassT.md)
- [LowpassTEnabled](markdown/LowpassTEnabled.md)


---

## DigitalLowpass

_Source: `markdown/DigitalLowpass.md`_

# DigitalLowpass

| Column 1 | Column 2 |
| --- | --- |
|  | DigitalLowpass recursively computes the mean value of the input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous m ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The mean value is set to initValue.

Compute

The mean value is computed via mean value (new) = mean value (old) + m *(in -mean value (old) ).

Out

The mean value is returned.


---

## LowpassK

_Source: `markdown/LowpassK.md`_

# LowpassK

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassK is a simplified PT1-function with gain constant K (low pass filter) . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous K ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The lowpass value is set to initValue.

Compute

The lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT*K.

Out

The lowpass value is returned.


---

## LowpassKEnabled

_Source: `markdown/LowpassKEnabled.md`_

# LowpassKEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassKEnabled is a simplified PT1-function with gain constant K (low pass filter). It must be enabled explicitly. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous K ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the lowpass value is set to initValue.

Compute

If enable is TRUE, the lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT*K.

Out

The lowpass value is returned.


---

## LowpassT

_Source: `markdown/LowpassT.md`_

# LowpassT

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassT is a simplified PT1-function with time constant T (low pass filter) |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous | none |
| compute | in ::continuous T ::continuous | none |
| out | none | continuous |

On activation of method

Reset

The lowpass value is set to initValue.

Compute

The lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT/ T.

Out

The lowpass value is returned.


---

## LowpassTEnabled

_Source: `markdown/LowpassTEnabled.md`_

# LowpassTEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowpassTEnabled is a simplified PT1-function with time constant T (low pass filter). It must be enabled explicitly . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| reset | initValue ::continuous initEnable ::logical | none |
| compute | in ::continuous T ::continuous enable ::logical | none |
| out | none | continuous |

On activation of method

Reset

If initEnable is TRUE, the lowpass value is set to initValue.

Compute

If enable is TRUE, the lowpass is computed via lowpass (new) = lowpass (old)+ (in - lowpass (old) ) * dT / T.

Out

The lowpass value is returned.


---

## ASCET MBFS System Library

_Source: `markdown/MBFS_SystemLibraryOverview.md`_

# MBFS System Library - Overview

The goal of the MBFS project was to establish the MSR MEGMA Automotive Library Specification as ASAM ([http://www.asam.net](http://www.asam.net)) standard.

The ASCET MBFS system library contains a subset of the blocks defined in the ASAM standard. Two export files - ETAS_MBFS_Library .exp and ETAS_MBFS_Library.axl - are available in the export subdirectory of your ASCET installation directory.

After the import, the library blocks are provided in the ETAS_MBFS_Library\MBFS_System_Library folder and its subfolders.

- [ArithmeticOperator](markdown/MBFS_SystemLibraryArithmeticOperators.md)
- [ComparisonOperators](markdown/MBFS_SystemLibraryComparisonOperators.md)
- [CountersAndTimers](markdown/MBFS_SystemLibraryCountersTimers.md)
- [DelayBlocks](markdown/MBFS_SystemLibraryDelayBlocks.md)
- [Integrators](markdown/MBFS_SystemLibraryIntegrators.md)
- [LogicalOperator](markdown/MBFS_SystemLibraryLogicalOperators.md)
- [LowAndHighPass](markdown/MBFS_SystemLibraryLowHighPass.md)
- [MathematicalFunction](markdown/MBFS_SystemLibraryMathematicalFunctions.md)
- [MemoryBlocks](markdown/MBFS_SystemLibraryMemoryBlocks.md)
- [NonlinearBlocks](markdown/MBFS_SystemLibraryNonlinearBlocks.md)
- [SignalPathSwitches](markdown/MBFS_SystemLibrarySignalPathSwitches.md)

The block icons are stored in ETAS_IconLib\*_MBFS folders, and the ETAS_MBFS_Library\MBFS_Signals folder contains the signals used to stimulate offline experiments with the library blocks.


---

## Arithmetic Operators

_Source: `markdown/MBFS_SystemLibraryArithmeticOperators.md`_

# MBFS System Library - Arithmetic Operators

The MBFS system library contains the following arithmetic operators:

- [Gain](markdown/MBFS_Gain.md)


---

## Gain

_Source: `markdown/MBFS_Gain.md`_

# Gain

| Column 1 | Column 2 |
| --- | --- |
|  | Gain returns the multiplication of the input value with a constant value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u:: continuous | continuous |

On activation of method

y

The result of the multiplication of u with constant k is returned.


---

## Comparison Operators

_Source: `markdown/MBFS_SystemLibraryComparisonOperators.md`_

# MBFS System Library - Comparison Operators

The MBFS system library contains the following comparison operators:

- [ClosedInterval](markdown/MBFS_Closed_Interval.md)
- [LeftOpenInterval](markdown/MBFS_Left_Open_Interval.md)
- [OpenInterval](markdown/MBFS_OpenInterval.md)
- [RightOpenInterval](markdown/MBFS_RightOpenInterval.md)


---

## ClosedInterval (MBFS)

_Source: `markdown/MBFS_Closed_Interval.md`_

# ClosedInterval (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | ClosedInterval returns TRUE if the value u is in the closed interval defined by MX and MN . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | MX:: continuous | logical |
|  | MN:: continuous |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if MN ≤ u ≤ MX. Otherwise FALSE is returned.


---

## LeftOpenInterval (MBFS)

_Source: `markdown/MBFS_Left_Open_Interval.md`_

# LeftOpenInterval (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | LeftOpenInterval returns TRUE if the value u is in the left open interval defined by MX and MN . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | MX:: continuous | logical |
|  | MN:: continuous |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if MN < u ≤ MX. Otherwise FALSE is returned.


---

## OpenInterval (MBFS)

_Source: `markdown/MBFS_OpenInterval.md`_

# OpenInterval (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | OpenInterval returns TRUE if the value u is in the open interval defined by MX and MN . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | MX:: continuous | logical |
|  | MN:: continuous |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if MN < u < MX. Otherwise FALSE is returned.


---

## RightOpenInterval (MBFS)

_Source: `markdown/MBFS_RightOpenInterval.md`_

# RightOpenInterval (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | RightOpenInterval returns TRUE if the value u is in the right open interval defined by MX and MN . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | MX:: continuous | logical |
|  | MN:: continuous |  |
|  | u:: continuous |  |

On activation of method

RightOpenInterval

TRUE is returned, if MN ≤ u < MX. Otherwise FALSE is returned.


---

## Counter and Timer

_Source: `markdown/MBFS_SystemLibraryCountersTimers.md`_

# MBFS System Library - Counters and Timers

The MBFS system library contains the following counters and timers:

- [CountDown_ResetEnabled](markdown/MBFS_CountDown_RE.md)
- [CountDown_ResetTriggerEnabled](markdown/MBFS_CountDown_RTE.md)
- [Counter_ResetEnabled](markdown/MBFS_Counter_RE.md)
- [Counter_ResetTriggerEnabled](markdown/MBFS_Counter_RTE.md)
- [StopWatch_ResetEnabled](markdown/MBFS_StopWatch_RE.md)
- [StopWatch_ResetTriggerEnabled](markdown/MBFS_StopWatch_RTE.md)
- [Timer_ResetEnabled](markdown/MBFS_Timer_RE.md)
- [Timer_ResetTriggerEnabled](markdown/MBFS_Timer_RTE.md)
- [Timer_Retrigger_ResetEnabled](markdown/MBFS_Timer_Retrigger_RE.md)
- [TimerRetrigger_ResetTriggerEnabled](markdown/MBFS_TimerRetrigger_RTE.md)


---

## CountDown_RE

_Source: `markdown/MBFS_CountDown_RE.md`_

# CountDownResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownResetEnabled returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV.

If reset is enabled, TRUE is returned if IV > O and FALSE if IV < O.


---

## CountDown_RTE

_Source: `markdown/MBFS_CountDown_RTE.md`_

# CountDownResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CountDownResetTriggerEnabled returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV . The countdown is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the counter is not reset, the method returns TRUE, if the number of block evaluations since the last reset is less than the initial number of block evaluations IV. If RT switches from FALSE to TRUE, the countdown is reset and the method returns TRUE if IV > 0 and FALSE is if IV < 0.


---

## Counter_RE

_Source: `markdown/MBFS_Counter_RE.md`_

# CounterResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CounterResetEnabled counts up and outputs the number of block evaluations since the last reset. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | continuous |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns the number of block evaluations since the last reset. If reset is enabled, the initial value IV is returned.


---

## Counter_RTE

_Source: `markdown/MBFS_Counter_RTE.md`_

# CounterResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | CounterResetTriggerEnabled counts up and outputs the number of block evaluations since the last reset. The counter is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | continuous |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the counter is not reset, the method returns the number of block evaluations since the last reset. If RT switches from FALSE to TRUE, the counter is reset and the initial value IV is returned.


---

## StopWatch_RE

_Source: `markdown/MBFS_StopWatch_RE.md`_

# StopWatchResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchResetEnabled outputs the time since the system init or the last reset. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | E:: logical | continuous |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns the time since the system init or the last reset. If reset is enabled, the time is reset to zero.


---

## StopWatch_RTE

_Source: `markdown/MBFS_StopWatch_RTE.md`_

# StopWatchResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | StopWatchResetTriggerEnabled outputs the time since the system init or the last reset. The stop watch is reset if the RT value switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | E:: logical | continuous |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and StopWatch is not reset, the time since the system init or the last reset is returned. If RT switches from FALSE to TRUE, StopWatchResetTriggerEnabled is reset and 0 is returned.


---

## Timer_RE

_Source: `markdown/MBFS_Timer_RE.md`_

# TimerResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerResetEnabled returns TRUE, if the initial time IV set at the last reset has not yet run down to zero. Reset can only be performed, after the counter has run down to zero. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled and E = TRUE, TRUE is returned if the initial time IV set at the last reset has not yet run down to zero. Otherwise, FALSE is returned.

If reset is enabled (i.e. R is TRUE and the variable x  0), the method returns TRUE for IV > 0 and FALSE for IV < 0.


---

## Timer_RTE

_Source: `markdown/MBFS_Timer_RTE.md`_

# TimerResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerResetTriggerEnabled returns TRUE, if the initial time IV set at the last reset has not yet run down to zero. If the counter has run down to zero and RT switches from FALSE to TRUE, reset is performed. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the timer is not reset, TRUE is returned if the initial time IV set at the last reset has not yet run down to zero. Otherwise, FALSE is returned.

If RT switches from FALSE to TRUE and the timer has run down to zero, the timer is reset. TRUE is returned if IV > 0 and FALSE if IV < 0.


---

## Timer_Retrigger_RE

_Source: `markdown/MBFS_Timer_Retrigger_RE.md`_

# TimerRetriggerResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerResetEnabled returns TRUE if the time x (set to the initial time IV at the last reset) has not yet run down to zero. A reset can be performed whenever required. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | R:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the method returns TRUE, if the number of block evaluations since the last reset is smaller than IV : dT. Otherwise FALSE is returned.

If reset is enabled, TRUE is returned if IV > 0 and FALSE if IV < 0.


---

## TimerRetrigger_RTE

_Source: `markdown/MBFS_TimerRetrigger_RTE.md`_

# TimerRetriggerResetTriggerEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | TimerRetriggerResetTriggerEnabled returns TRUE if the time x (set to the initial time IV at the last reset) has not yet run down to zero. A reset can be performed whenever required. The timer retrigger is reset if RT switches from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | I V:: continuous | logical |
|  | E:: logical |  |
|  | RT:: logical |  |

On activation of method

y

If E = TRUE and the timer is not reset, the method returns TRUE, if the number if block evaluations since the last reset is smaller than IV : dT. Otherwise FALSE is returned.

If RT switches from FALSE to TRUE, the timer is reset and TRUE is returned if IV > 0 and FALSE if IV < 0.


---

## Delay Blocks

_Source: `markdown/MBFS_SystemLibraryDelayBlocks.md`_

# MBFS System Library - Delay Blocks

The MBFS system library contains the following delay blocks:

- [Delay_ResetEnabled_Logic](markdown/MBFS_Delay_RE_Logic.md)
- [Delay_ResetEnabled_Real](markdown/MBFS_Delay_RE_Real.md)
- [TurnOffDelaySample](markdown/MBFS_TurnOffDelaySample.md)
- [TurnOffDelayTime](markdown/MBFS_TurnOffDelayTime.md)
- [TurnOnDelaySample](markdown/MBFS_TurnOnDelaySample.md)
- [TurnOnDelayTime](markdown/MBFS_TurnOnDelayTime.md)


---

## Delay_RE_Logic

_Source: `markdown/MBFS_Delay_RE_Logic.md`_

# DelayResetEnabledLogic

| Column 1 | Column 2 |
| --- | --- |
|  | DelayResetEnabledLogic delays the logical input signal u by one sample time dT . The reset value IV has direct influence on the output. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | IV:: logical | logical |
|  | E:: logical |  |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the logical input u delayed by one sample time dT is returned.

If reset is enabled the value IV is returned.


---

## Delay_RE_Real

_Source: `markdown/MBFS_Delay_RE_Real.md`_

# DelayResetEnabledReal

| Column 1 | Column 2 |
| --- | --- |
|  | DelayResetEnabledReal delays the real input signal u by one sample time dT . The reset value IV has direct influence on the output. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | IV:: continuous | continuous |
|  | E:: logical |  |
|  | R:: logical |  |
|  | u:: continuous |  |

On activation of method

y

If reset is disabled (i.e. R = FALSE) and E = TRUE, the real input u delayed by one sample time dT is returned.

If reset is enabled the value IV is returned.


---

## TurnOffDelaySample

_Source: `markdown/MBFS_TurnOffDelaySample.md`_

# TurnOffDelaySample

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelaySample : A falling edge at time t = i * dT of the input signal u is delayed by n block evaluations (samples). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | n:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE or the number of delay samples n has not yet been counted down to ≤ 0.

FALSE is returned if u = FALSE and the number of delay samples n has been counted down to ≤ 0.


---

## TurnOffDelayTime

_Source: `markdown/MBFS_TurnOffDelayTime.md`_

# TurnOffDelayTime

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOffDelayTime delays a falling edge of the input signal by the time T , if the input signal remains FALSE for minimum the whole period T . The relationship between the time delay t and the number of delay samples n is |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | T:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE or the number of delay samples n = T : dT has not yet been counted down to ≤ 0.

FALSE is returned if u = FALSE and the number of delay samples n = T : dT has been counted down to ≤ 0.


---

## TurnOnDelaySample

_Source: `markdown/MBFS_TurnOnDelaySample.md`_

# TurnOnDelaySample

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelaySample : A rising edge at time t = i * dT of the input signal u is delayed by n block evaluations (samples). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | n:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE and the number of block evaluations n has been counted down to ≤ 0.

FALSE is returned if u = FALSE or the number of block evaluations n has not yet been counted down to ≤ 0.


---

## TurnOnDelayTime

_Source: `markdown/MBFS_TurnOnDelayTime.md`_

# TurnOnDelayTime

| Column 1 | Column 2 |
| --- | --- |
|  | TurnOnDelayTime delays a rising edge of the input signal by the Time T , if the input signal remains high (TRUE) for minimum this period T . The relationship between the time delay t and the number of delay samples n is |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | T:: continuous | logical |
|  | R:: logical |  |
|  | u:: logical |  |

On activation of method

y

TRUE is returned, if u = TRUE and the number of block evaluations n = T : dT has been counted down to ≤ 0.

FALSE is returned if u = FALSE or the number of block evaluations n = T : dT has not yet been counted down to ≤ 0.


---

## Integrators

_Source: `markdown/MBFS_SystemLibraryIntegrators.md`_

# MBFS System Library - Integrators

The MBFS system library contains the following integrators:

- [Accumulator_ResetEnabledLimited](markdown/MBFS_Accumulator_REL.md)
- [IntegratorK_ResetEnabledLimited](markdown/MBFS_IntegratorK_REL.md)
- [IntegratorT_ResetEnabledLimited](markdown/MBFS_IntegratorT_REL.md)


---

## Accumulator_REL

_Source: `markdown/MBFS_Accumulator_REL.md`_

# AccumulatorResetEnabledLimited

| Column 1 | Column 2 |
| --- | --- |
|  | AccumulatorResetEnabledLimited : The output y is the limited sum of all input values u . If the accumulator is reset, IV is the initial value of the sum. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| B_max |  | logical |
| B_min |  | logical |
| compute | MN :: continuous |  |
|  | MX :: continuous |  |
|  | u ::continuous |  |
| y |  | continuous |

On activation of method

B_max

If y was set to the upper limit MX, TRUE is returned. Otherwise, FALSE is returned.

B_min

If y was set to the lower limit MN, TRUE is returned. Otherwise, FALSE is returned.

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the sum of all input values u, limited by MX and MN (--> Limiter), stored in y, is returned.

If reset is enabled, y is set to the initial value IV.

y

The value stored in y is returned.


---

## IntegratorK_REL

_Source: `markdown/MBFS_IntegratorK_REL.md`_

# IntegratorKResetEnabledLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorKResetEnabledLimited is a time discrete integrator with gain K . The integrated value, and therefore the output y , are limited by the inputs MX and MN (y is element of [MN,MX]). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| B_max |  | logical |
| B_min |  | logical |
| compute | K ::continuous |  |
|  | MN :: continuous |  |
|  | MX :: continuous |  |
|  | u ::continuous |  |
| y |  | continuous |

On activation of method

B_max or

If y was set to the upper limit Mx, TRUE is returned. Otherwise, FALSE is returned.

B_min

If y was set to the lower limit Mn, TRUE is returned. Otherwise, FALSE is returned.

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the integration is performed: integrator(new) = integrator (old) + u * dT * K. The result, stored in the variable y, is limited by the inputs MX and MN (--> Limiter) and returned.

If reset is enabled, y is set to the initial value IV.

y

The value stored in y is returned.


---

## IntegratorT_REL

_Source: `markdown/MBFS_IntegratorT_REL.md`_

# IntegratorTResetEnabledLimited

| Column 1 | Column 2 |
| --- | --- |
|  | IntegratorTResetEnabledLimited is a time discrete integrator with gain 1/T . The integrated value and therefore the output y are limited by the inputs MX and MN (y is element of [MN,MX]). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| B_max |  | logical |
| B_min |  | logical |
| compute | MN :: continuous |  |
|  | MX :: continuous |  |
|  | T ::continuous |  |
|  | u ::continuous |  |
| y |  | continuous |

On activation of method

B_max or

If y was set to the upper limit Mx, TRUE is returned. Otherwise, FALSE is returned.

B_min

If y was set to the lower limit Mn, TRUE is returned. Otherwise, FALSE is returned.

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the integration is performed: integrator(new) = integrator (old) + u * dT * 1/T. The result, stored in the variable y, is limited by the inputs MX and MN (--> Limiter) and returned.

If reset is enabled, y is set to the initial value IV.

y

The value stored in y is returned.


---

## Logical Operators

_Source: `markdown/MBFS_SystemLibraryLogicalOperators.md`_

# MBFS System Library - Logical Operators

The MBFS system library contains the following logical operators:

- [XOR](markdown/MBFS_XOR.md)


---

## XOR (MBFS)

_Source: `markdown/MBFS_XOR.md`_

# XOR (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | XOR returns TRUE, if one of the inputs is TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u1:: logical | logical |
|  | u2:: logical |  |

On activation of method

XOR

TRUE is returned, if u1 = TRUE and u2 = FALSE or u1 = FALSE and u2 = TRUE. Otherwise, FALSE is returned.


---

## Low and High Pass

_Source: `markdown/MBFS_SystemLibraryLowHighPass.md`_

# MBFS System Library - Low and High Pass

The MBFS system library contains the following low-pass and high-pass blocks:

- [DigitalLowPass_ResetEnabled](markdown/MBFS_DigitalLowPass_RE.md)
- [HighPassT_ResetEnabled](markdown/MBFS_HighPassT_RE.md)
- [LowPassK_ResetEnabled](markdown/MBFS_LowPassK_RE.md)
- [LowPass_SecondOrder_ResetEnabled](markdown/MBFS_LowPassSecond_RE.md)
- [LowPassT_ResetEnabled](markdown/MBFS_LowPassT_RE.md)


---

## DigitalLowPass_RE

_Source: `markdown/MBFS_DigitalLowPass_RE.md`_

# DigitalLowPassResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | DigitalLowPassResetEnabled performs a discrete time first order lowpass with linear approximation. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | m :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + m*(u - x) is buffered.

If reset is enabled, x = IV is buffered.

y

returns the value x.


---

## HighPassT_RE

_Source: `markdown/MBFS_HighPassT_RE.md`_

# HighPassTResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | HighPassTResetEnabled performs a discrete-time first-order high-pass filter with the continuous-time Laplace notation G(s) = (TD * s) / (1 + T * s) The relationship between the analogue cut-off-frequency (f c ) and T is f c = 1 / (2* p *T) |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | T :: continuous |  |
|  | TD :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x1 = x1 + (TD*u - TD*x2 - dT*x1)/T is buffered. If reset is enabled, x1 = IV is buffered.

y

returns the value x1.


---

## LowPassK_RE

_Source: `markdown/MBFS_LowPassK_RE.md`_

# LowPassKResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassKResetEnabled performs a discrete-time first-order low-pass filter with time constant 1/K . The Laplace notation is G(s) = K / (s+K). The relationship between the analogue cut-off frequency (f c ) and K is f c = K / (2 * p ). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | K :: continuous |  |
|  | u :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | IV :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + K*dT*(u-x) is buffered. If reset is enabled, x = IV is buffered.

y

returns the value x.


---

## LowPassSecond_RE

_Source: `markdown/MBFS_LowPassSecond_RE.md`_

# LowPassSecondOrderResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassSecondOrderResetEnabled performs a discrete-time second-order low-pass filter with time constant T and damping factor D (PT2). |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV1 ::continuous |  |
|  | IV2 ::continuous |  |
|  | D :: continuous |  |
|  | T :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x1 = x2 + (pow(dT, 2)*(u - x2))/temp1 + pow(T,2)*(x2 - temp)/temp1 is buffered. If reset is enabled, x1 = IV1 is buffered.

y

returns the value x1.


---

## LowPassT_RE

_Source: `markdown/MBFS_LowPassT_RE.md`_

# LowPassTResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | LowPassTResetEnabled performs a discrete-time first-order low-pass filter with time constant T . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | T :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, x = x + dT/T *(u-x) is buffered. If reset is enabled, x = IV is buffered.

y

returns the value x.


---

## Mathematical Functions

_Source: `markdown/MBFS_SystemLibraryMathematicalFunctions.md`_

# MBFS System Library - Mathematical Functions

The MBFS system library contains the following mathematical function blocks:

- [SQR](markdown/MBFS_SQR.md)
- [SQRT](markdown/MBFS_SQRT.md)


---

## SQR

_Source: `markdown/MBFS_SQR.md`_

# SQR

| Column 1 | Column 2 |
| --- | --- |
|  | SQR returns the square of the input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u :: continuous | continuous |

On activation of method

SQR

Returns u².


---

## SQRT

_Source: `markdown/MBFS_SQRT.md`_

# SQRT

| Column 1 | Column 2 |
| --- | --- |
|  | SQRT returns the square root of the input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u :: continuous | continuous |

On activation of method

SQRT

Returns the square root of u.


---

## Memory Blocks

_Source: `markdown/MBFS_SystemLibraryMemoryBlocks.md`_

# MBFS System Library - Memory Blocks

The MBFS system library contains the following memory blocks:

- [DeltaOneStep](markdown/MBFS_DeltaOneStep.md)
- [DifferenceQuotient](markdown/MBFS_DifferenceQuotient.md)
- [EdgeBi](markdown/MBFS_EdgeBi.md)
- [EdgeFalling](markdown/MBFS_EdgeFalling.md)
- [EdgeRising](markdown/MBFS_EdgeRising.md)
- [RSFlipFlop](markdown/MBFS_RSFlipFlop.md)
- [SampleAndHold_ResetEnabled](markdown/MBFS_SampleAndHold_RE.md)


---

## DeltaOneStep (MBFS)

_Source: `markdown/MBFS_DeltaOneStep.md`_

# DeltaOneStep (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | DeltaOnestep returns the difference between the current and the last input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV:: continuous |  |
|  | R :: logical |  |
|  | u:: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE), the difference between the current and the last input value u is buffered. If reset is enabled, the difference between u and IV is buffered.

y

Returns the buffered value.


---

## DifferenceQuotient (MBFS)

_Source: `markdown/MBFS_DifferenceQuotient.md`_

# DifferenceQuotient (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | DifferenceQuotient returns the rate of change of the input signal u over time. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV:: continuous |  |
|  | R :: logical |  |
|  | u:: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) the rate of change of the input signal u over time is buffered.

If reset is enabled, (u - IV) : dT is buffered.

y

returns the buffered value.


---

## EdgeBi (MBFS)

_Source: `markdown/MBFS_EdgeBi.md`_

# EdgeBi (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeBi returns TRUE at any change of the logical input value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE), TRUE is buffered at any change of the logical input value u.

If reset is enabled, TRUE is buffered, if u and IV are not identical. Otherwise, FALSE is buffered.

y

returns the buffered value x.


---

## EdgeFalling (MBFS)

_Source: `markdown/MBFS_EdgeFalling.md`_

# EdgeFalling (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeFalling returns TRUE if the input value changes from TRUE to FALSE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) TRUE is buffered if the input value changes from TRUE to FALSE.

y

returns the buffered value x.


---

## EdgeRising (MBFS)

_Source: `markdown/MBFS_EdgeRising.md`_

# EdgeRising (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | EdgeRising returns TRUE if the input value changes from FALSE to TRUE. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::logical |  |
|  | R ::logical |  |
|  | u ::logical |  |
| y | none | logical |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) TRUE is buffered if the input value changes from FALSE to TRUE.

y

returns the buffered value x.


---

## RSFlipFlop (MBFS)

_Source: `markdown/MBFS_RSFlipFlop.md`_

# RSFlipFlop (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | RSFlipFlop : The input RST (reset) dominates the input SET (set). The first output returns the stored boolean input value, whilst the second output value is the logical negation of the first output. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | SET ::logical |  |
|  | RST ::logical |  |
| Q | none | logical |
| _Q | none | logical |

On activation of method

compute

Buffers FALSE if RST is TRUE.

If RST = FALSE and SET = TRUE, TRUE is buffered.

If RST = FALSE and SET = FALSE, FALSE is buffered.

Q

Returns the buffered value x.

_Q

Returns the buffered value !x.


---

## SampleAndHold_RE

_Source: `markdown/MBFS_SampleAndHold_RE.md`_

# SampleAndHoldResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | SampleAndHoldResetEnabled is a memory block with enable and reset ports. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| y | none | continuous |

On activation of method

SampleAndHoldResetEnabled

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the value u is buffered. If reset is enabled, the value IV is buffered.

y

returns the buffered value x.


---

## Nonlinear Blocks

_Source: `markdown/MBFS_SystemLibraryNonlinearBlocks.md`_

# MBFS System Library - Nonlinear Blocks

The MBFS system library contains the following nonlinear blocks:

- [AbsoluteValue](markdown/MBFS_AbsoluteValue.md)
- [DeadBand](markdown/MBFS_DeadBand.md)
- [DifferenceLimiter](markdown/MBFS_DifferenceLimiter.md)
- [Gradient_Limiter](markdown/MBFS_Gradient_Limiter.md)
- [Hysteresis](markdown/MBFS_Hysteresis.md)
- [Limiter](markdown/MBFS_Limiter.md)
- [MaxLog_ResetEnabled](markdown/MBFS_MaxLog_RE.md)
- [MeanValueT_ResetEnabled](markdown/MBFS_MeanValueT_RE.md)
- [MinLog_ResetEnabled](markdown/MBFS_MinLog_RE.md)
- [Sign](markdown/MBFS_Sign.md)


---

## AbsoluteValue

_Source: `markdown/MBFS_AbsoluteValue.md`_

# AbsoluteValue

| Column 1 | Column 2 |
| --- | --- |
|  | AbsoluteValue returns the absolute value of the input number. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u ::continuous | continuous |

On activation of method

AbsoluteValue

The absolute value of u is returned.


---

## DeadBand

_Source: `markdown/MBFS_DeadBand.md`_

# DeadBand

| Column 1 | Column 2 |
| --- | --- |
|  | DeadBand returns zero if the input value is between UMIN and UMAX . Otherwise the output signal is the input signal reduced by the input limits. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | UMAX:: continuous | continuous |
|  | UMIN:: continuous |  |
|  | u:: continuous |  |

On activation of method

DeadBand

Returns 0 if UMIN < u < UMAX.

Returns (u - UMAX) if u ≥ UMAX.

Returns (u - UMIN) if u ≤ UMIN


---

## DifferenceLimiter

_Source: `markdown/MBFS_DifferenceLimiter.md`_

# DifferenceLimiter

| Column 1 | Column 2 |
| --- | --- |
|  | DifferenceLimiter increments the output value y by the limited difference between consecutive input values. D u = u(n) - u(n-1): The input parameters can have signs, and the condition LU ≥ LD is assumed, but not checked. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV:: continuous |  |
|  | LD ::continuous |  |
|  | LU ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the output is buffered in the variable y as follows:

if ( (u-y) > LU ) { y = y+LU; B_min = 0; B_max = 1; } else if ( (u-y) < LD ) { y = y+LD; B_min = 1; B_max = 0; } else { y = u; B_min = 0; B_max = 0; }

If reset is enabled (i.e. R = TRUE), the initial value IV is buffered in the variable y.

B_max

The value stored in B_max is returned.

B_min

The value stored in B_min is returned.

y

The value buffered in y is returned.


---

## Gradient_Limiter

_Source: `markdown/MBFS_Gradient_Limiter.md`_

# GradientLimiter

| Column 1 | Column 2 |
| --- | --- |
|  | GradientLimiter increments the output value y by the limited difference between consecutive input values over time D u. The input parameters can have signs, and the condition LU ≥ LD is assumed, but not checked. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV ::continuous |  |
|  | LU ::continuous |  |
|  | LD ::continuous |  |
|  | E ::logical |  |
|  | R ::logical |  |
|  | u ::continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, the output is buffered in the variable y as follows:

if ( ((u-y)/dT) > LU ) { y = y+LU; B_min = 0; B_max = 1; } else if ( ((u-y)/dT) < LD ) { y = y+LD; B_min = 1; B_max = 0; } else { y = u; B_min = 0; B_max = 0; }

If reset is enabled (i.e. R = TRUE), the variable y is set to the initial value IV.

B_max

The value stored in B_max is returned.

B_min

The value stored in B_min is returned.

y

The value stored in y is returned.


---

## Hysteresis

_Source: `markdown/MBFS_Hysteresis.md`_

# Hysteresis

| Column 1 | Column 2 |
| --- | --- |
|  | The Hysteresis implemented in this block is the Schmitt Trigger function. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| y | IV:: logical | logical |
|  | RSP:: continuous |  |
|  | LSP:: continuous |  |
|  | R:: logical |  |
|  | u:: continuous |  |

On activation of method

y

TRUE is returned, if u > RSP.

FALSE is returned, if u < LSP.

The state of the preceding Hysteresis is returned, if RSP ≥ u ≥ LSP.


---

## Limiter (MBFS)

_Source: `markdown/MBFS_Limiter.md`_

# Limiter (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | Limiter returns the input value u limited by MX and MN . The increasing value domain is split in different intervals depending on the limitation values. The boolean output flags B_MAX and B_MIN represent an active limitation in both directions. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | MX :: continuous |  |
|  | MN :: continuous |  |
|  | u :: continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

Buffers y = MX, B_max = TRUE, B_min = FALSE, if u > MX. Buffers y = MN, B_max = FALSE, B_min = TRUE, if u < MN. Otherwise the Limiter buffers y = u, B_max = FALSE, B_min = FALSE.

B_max

Returns the buffered state B_max.

B_min

Returns the buffered state B_min.

y

Returns the buffered value y.


---

## MaxLog_RE

_Source: `markdown/MBFS_MaxLog_RE.md`_

# MaxLogResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | MaxLogResetEnabled returns the maximum value of all occurred input values with respect to the initial value IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| B_max | none | logical |
| y | none | continuous |

On activation of method

compute

B_max is set to FALSE. If reset is disabled (i.e. R = FALSE) and E = TRUE, the maximum value y of all occurred inputs is buffered. If u > y, B_max is set to TRUE; otherwise, B_max remains FALSE. If reset is enabled, the value y = IV and B_max = FALSE is buffered.

B_max

Returns the buffered state B_max.

y

Returns the buffered maximum value y.


---

## MeanValueT_RE

_Source: `markdown/MBFS_MeanValueT_RE.md`_

# MeanValueTResetEnabled and MeanValueT_RE_ESDL

| Column 1 | Column 2 |
| --- | --- |
|  | MeanValueTResetEnabled returns the mean value of the array x with length k . The array x stores the last k input values u . k is an internal constant and cannot be changed during runtime. Reset can be performed at any time. If you change the value of k , you must change the size of array x as well. MeanValueT_RE_ESDL is an ESDL version of the same functionality. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments / Input Variables | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| y | none | continuous |

On activation of method

compute

If reset is disabled (i.e. R = FALSE) and E = TRUE, then the mean value of the array (i.e. of the last k input values u) is buffered.

If reset is enabled (i.e. R =TRUE), then each element of the array is set to IV and the mean is buffered, which is IV.

y

Returns the buffered mean value.


---

## MinLog_RE

_Source: `markdown/MBFS_MinLog_RE.md`_

# MinLogResetEnabled

| Column 1 | Column 2 |
| --- | --- |
|  | MinLogResetEnabled returns the minimum value of all occurred input values u with respect to the initial value IV . |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | IV :: continuous |  |
|  | E :: logical |  |
|  | R :: logical |  |
|  | u :: continuous |  |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

B_min is set to FALSE. If reset is disabled (i.e. R = FALSE) and E = TRUE, the minimum value y of all occurred inputs is buffered. If u < y, B_min is set to TRUE; otherwise, B_min remains FALSE. If reset is enabled, the value y = IV and B_max = FALSE is buffered.

B_min

Returns the buffered state B_min.

y

Returns the buffered minimum value y.


---

## Sign (MBFS)

_Source: `markdown/MBFS_Sign.md`_

# Sign (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | Sign performs signum functionality for ASAM specifications. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | u:: continuous | continuous |

On activation of method

y

Returns 0 if u = 0.

Returns 1 if u > 0.

Returns -1 if u < 0.


---

## Signal Path Switches

_Source: `markdown/MBFS_SystemLibrarySignalPathSwitches.md`_

# MBFS System Library - Signal Path Switches

The MBFS system library contains the following signal path switches:

- [Switch_Logic](markdown/MBFS_Switch_logic.md)
- [Switch_Real](markdown/MBFS_Switch_Real.md)


---

## Switch_Logic

_Source: `markdown/MBFS_Switch_logic.md`_

# Switch_Logic

| Column 1 | Column 2 |
| --- | --- |
|  | Switch_Logic performs switch functionality with logic data types and acts as a signal path switch. The block's input value l has a direct effect on the output value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | l :: logical | logical |
|  | u1 :: logical |  |
|  | u2 :: logical |  |

On activation of method

y

Returns u1 (logical value), if l is TRUE. Otherwise u2 (logical value) is returned.


---

## Switch_Real

_Source: `markdown/MBFS_Switch_Real.md`_

# Switch_Real

| Column 1 | Column 2 |
| --- | --- |
|  | Switch_Real performs switch functionality with real data types and acts as a signal path switch. The block's input value has a direct effect on the output value. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| y | l :: logical | continuous |
|  | u1 :: continuous |  |
|  | u2 :: continuous |  |

On activation of method

y

Returns u1 (real value), if l is TRUE. Otherwise u2 (real value) is returned.


---

