# dT Variable

In control engineering applications the result of the calculations within a component often depends on the value of the sampling rate. ASCET provides the system variable dT (type symbol![](symboltyp_dt.gif)) for uniformly describing the algorithms for all sampling rates. The value of this parameter is provided by the operating system and represents the time difference since the last activation of the currently active task.

The name dT is reserved for the system variable. You can create no other element with that name; since [reserved keywords](INT_Reserved_Keywords.md) do not distinguish between upper and lower case, DT, dt, and Dt are reserved, too.

See also

[Reserved Keywords](INT_Reserved_Keywords.md)
