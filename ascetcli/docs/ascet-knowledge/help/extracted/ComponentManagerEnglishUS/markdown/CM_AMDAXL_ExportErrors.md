# AMD/AXL Export Errors

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
| ID | Message Text | Causes | Autofix |
| XMLe01 | Duplicated export path |  | (none) |
| XMLe02 | Invalid export path | The export path contains keywords reserved for the file system, e.g., LPT1, COM1, ... | (none) |
| XMLw03 | Missing Implementation | The component contains C code that refers to a missing implementation. | This C-code will get lost! |
| XMLw04 | Too long export path | The export path, including the file name, is longer than 260 characters. | If possible, export path will be shortened. |
| XMLw05 | Incompatible <CustomerData> | Content of <CustomerData> not compatible with ASCET V<x>.<y> detected. | The <CustomerData> tag will get lost. |
| XMLe06 | Incompatible item. (See monitor for details) | The component contains items that are not available in the selected AMD version. | (none) |
| XMLw07 | Incompatible Object XXXX | An object not compatible with ASCET Vx.y.z was detected. You either need a patch for this version or you have to adapt the generated AMD file manually. | (none) |
| XMLe08 | Enumeration index values are NOT consecutive. (See monitor for details) | The enumeration values are either non-consecutive, or they do not start with 0. | (none) |
| XMLe13 | Software Component Mapping not compatible. (See monitor for details) | Message or parameter mapping used in the SWC is not compatible with the AMD version selected for the export. | (none) |
| XMLw21 | File uses deprecated schema a.b.c.d. Wanted is w.x.y.z. | The file was exported with an old AMD/AXL version. | Ignore the version difference. |

See also

[Introduction - Reserved Keywords](IntroductionEnglishUS.chm::/INT_Reserved_Keywords.htm)

[Editing an Enumerator](rename_enumerator.md)
