# ASCET and SCOOP-IX

SCOOP-IX is short for SCOOP Interface Exchange Language. This language is based on XML and, therefore, well suited for use in INTECRIO, ASCET or similar tools.

Exactly one SCOOP-IX file is generated for one ASCET project, regardless of the number of modules and classes in the project.

This topic shows some correspondences between ASCET settings and the resulting SCOOP-IX code. More details on SCOOP-IX are given in the INTECRIO user’s guide.

##### General Information

The following information is part of the SCOOP-IX file:

- The ASCET component in which the equivalent of the respective interface element is embedded
- The type of component (class, module or project; <pathNode> block with kind="asd:module" option, see [here](IIO_SCOOPIX_Example.md#pathNode_mod))
- The type of equivalent of the interface element (element, message, resource, method, process, task; <pathNode> block with kind="asd:element" option, see [here](IIO_SCOOPIX_Example.md#pathNode_el))

##### Implementation Information

The settings for Implementation Interval Adaptation are written to the <saturation> block in the SCOOP-IX file, see [here](IIO_SCOOPIX_Example.md#saturation)).

The <saturation> block contains the options value, resolution and assignment. Depending on the settings in the ASCET implementation editor, the options are set as follows.

- value is set to true (false) if Limit to maximum bit length is activated (deactivated).
- resolution is set to automatic, keep, or reduce, depending on the selection in the combo box next to Limit to maximum bit length.
- assignment is set to true (false) if Limit Assignments is activated (deactivated).

Beginning with ASCET V6.4, the Zero not included option is no longer available. The value option of the <zeroExcluded> block, which previously stored the setting of Zero not included, still exists in SCOOP-IX; it is always set to value="false" (see [here](IIO_SCOOPIX_Example.md#zeroExcluded)).

##### Element Properties

Information on measurement or calibration is given in the <usage> block in SCOOP-IX, see [here](IIO_SCOOPIX_Example.md#usage_m) (measurement) or [here](IIO_SCOOPIX_Example.md#usage_c) (calibration).

- For parameters, the <usage> block contains the calibration option. Its value is set to true (false) if the Calibration option in the Properties editor is activated (deactivated).
- For variables and messages, the <usage> block contains the measurement option. Its value is set to true.
- For constants and system constants, the <usage> block contains the measurement option. Its value is set to false.

The scope of an element is set in the Scope area of the Properties editor. The selected scope is written to the visibility option of the <modelKind> block in SCOOP-IX.

- Exported scope → visibility="public" (see [here](IIO_SCOOPIX_Example.md#modelKind_pu))
- Local scope → visibility="private" (see [here](IIO_SCOOPIX_Example.md#modelKind_pr))

Elements with scope Imported do not appear in the SCOOP-IX file.

See also

[SCOOP-IX Example](IIO_SCOOPIX_Example.md)
