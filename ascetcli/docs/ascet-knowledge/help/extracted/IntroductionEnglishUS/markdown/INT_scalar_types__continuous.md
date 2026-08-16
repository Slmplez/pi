# Scalar Types: Continuous

Continuous (type symbol ![](symboltyp_cont.gif)) is used for continuous physical values that can be infinitely large and have an arbitrarily fine resolution. This type is suitable for modelling variables like temperature, speed, etc., it is referred to as model type cont.

A model that calculates with values of continuous type is generated with optimizations for precision and efficiency. x / 2 * 2, for example, is optimized to x.

In implementation experiments, overflow protection and limitation is applied according to the settings in the implementation editor (see [Specifying Individual Implementations](ImplementationEditorEnglishUS.chm::/specifying_individual_impl.htm)).
