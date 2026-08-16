# Scalar Types: Signed Discrete

Signed discrete (type symbol ![](symboltyp_sdisc.gif)) is used to model integer numbers of arbitrary size, it is referred to as model type sdisc.

The signed discrete type is deprecated. To use it, you must activate the [editor option](ComponentManagerEnglishUS.chm::/cm_options_for_editors.htm) Use signed/unsigned discrete types.

A model that calculates with values of signed discrete type is generated with optimizations for precision and efficiency. x / 2.0 * 2.0, for example, is optimized to x.

In implementation experiments, overflow protection and limitation is applied according to the settings in the implementation editor (see [Specifying Individual Implementations](ImplementationEditorEnglishUS.chm::/specifying_individual_impl.htm)).

See also

[Converting sdisc/udisc to limitInt/wrapInt](INT_Convert_SdiscUdisc_to_limitInt_wrapInt.md)

[Editor Options](ComponentManagerEnglishUS.chm::/cm_options_for_editors.htm)

[Specifying Individual Implementations](ImplementationEditorEnglishUS.chm::/specifying_individual_impl.htm)
