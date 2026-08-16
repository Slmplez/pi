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
