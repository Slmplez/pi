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
