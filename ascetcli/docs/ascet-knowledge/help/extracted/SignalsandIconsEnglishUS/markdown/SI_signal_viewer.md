# Signal Viewer

With the signal viewer signals can be loaded into the ASCET database or workspace and viewed. The viewer can read a variety of signal formats and convert signals between formats.

The following measurement data formats are supported by ASCET:

- Tab delimited ASCII. Almost every spreadsheet or database can read and write in this format.
- FAMOS Channel Format.
- FAMOS Record Format.
- Matlab Source Code Format (i.e., *.m).
- MDF V2.00 Format.

ASCET can import MDF V2.* and MDF V3.* files, but the enhancements of higher versions are ignored.

The last four are third-party formats for measurement data. Please refer to the relevant documentation for details. Internally, ASCET can process the ASCII format and both types of FAMOS format. MDF and Matlab source code format can be read and written.

See also

[Creating a Signal](SI_Creating_a_Signal.md)

[Opening a Signal](SI_create_open_signal.md)

[Importing Measurement Data to a Signal](SI_import_measurement_data.md)

[Viewing Measurement Data](SI_view_measurment_data.md)

[Exporting a Signal](SI_Exporting_Signal.md)
