# Differential Equations in ESDL

In ESDL, each continuous state variable supports the derivation operator ddt. Differential equations can be described with the ddt operator.

An example may be a PT2 system with the continuous state variables x and xp, the input in, and the parameters d, T, K. The mathematical description of the system is:

x’ = xp;

xp’ = (K*in - (2.0*d*T*xp) - x) / (T*T);

When modeling this PT2 system with ESDL, the derivations are specified by means of the ddt method:

x.ddt(xp);

xp.ddt( (K*in - (2.0*d*T*x.ddt()) - x) / (T*T) );

The derivatives on the left side of a differential equation (i.e., in the argument of a derivation method) cannot be accessed. If such an access is required, the system needs to be reformulated.

The ddt operator can only be used in the derivatives () method

See also

[Overview - Modeling with ESDL](CTB_Overview_Modeling_with_ESDL.md)

[Semantic Checks in ESDL](CTB_Semantic_Checks_in_ESDL.md)

[Overview - Additional Library Functions](CTB_Overview_Additional_Library_Functions.md)
