# Differential Equations in C

In C, an internal derivation variable is created for each continuous state variable. The name of this variable is composed of the name of the state variable and the prefix ddt.

Examples are the continuous state variables x and xp; the automatically created derivation variables are ddtx and ddtxp. They are visible in all methods.

A complete example is a PT2 system with the continuous state variables x and xp, the input in, and the parameters d, T, K.

x’ = xp;

xp’ = (K*in - (2.0*d*T*xp) - x) / (T*T);

The PT2 system above can be expressed as C code in the CT block as follows:

ddtx = xp;

ddtxp = (K*in - (2.0*d*T*ddtx) - x) / (T*T);

See also

[Overview - Modeling in C](CTB_Overview_Modeling_in_C.md)

[Overview - Additional C Routines](CTB_Overview_Additional_C_Routines.md)

[Overview - Differential Equations and Integration Algorithms](ctb_overview_differential_equations_and_integration_algorithms.md)
